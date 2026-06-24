const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

const pool = new Pool({
  user: 'appuser',
  host: 'localhost',
  database: 'american_dream',
  password: 'student',
  port: 5432,
});

// Path to the election data folder — adjust if needed
const DATA_DIR = path.join(__dirname, '..', 'election_data');

// ─── HELPERS ──────────────────────────────────────────────

function readPSV(filename) {
  const raw = fs.readFileSync(path.join(DATA_DIR, filename), 'utf-8');
  const lines = raw.trim().split('\n');
  const headers = lines[0].split('|').map(h => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split('|').map(v => v.trim());
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = values[idx] || null; });
    rows.push(obj);
  }
  return rows;
}

function parseSocieties(filename) {
  const raw = fs.readFileSync(path.join(DATA_DIR, filename), 'utf-8');
  const lines = raw.trim().split('\n').filter(l => l.trim());
  return lines.map(line => {
    // Format: "1. American Medical Association (AMA) - Medicine"
    const match = line.match(/^(\d+)\.\s+(.+?)\s*-\s*(.+)$/);
    if (!match) return null;
    return { id: parseInt(match[1]), name: match[2].trim(), description: match[3].trim() };
  }).filter(Boolean);
}

// ─── IMPORT FUNCTIONS ─────────────────────────────────────

async function importSocieties() {
  console.log('Importing societies...');
  const societies = parseSocieties('societies.txt');
  for (const s of societies) {
    await pool.query(
      `INSERT INTO society (society_id, name, description, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       ON CONFLICT (society_id) DO NOTHING`,
      [s.id, s.name, s.description]
    );
  }
  // Reset the sequence so new inserts get the right IDs
  await pool.query(`SELECT setval('society_society_id_seq', (SELECT MAX(society_id) FROM society))`);
  console.log(`  ✓ ${societies.length} societies imported`);
}

async function importMembers() {
  console.log('Importing members from members.psv...');
  const rows = readPSV('members.psv');
  const defaultHash = await bcrypt.hash('password123', 10);

  let count = 0;
  for (const r of rows) {
    const memberId = parseInt(r['Member ID']);
    const societyId = parseInt(r['Society ID']);
    const role = r['Role'] || 'member';
    const email = `${r['Username']}${memberId}@example.com`;

    await pool.query(
      `INSERT INTO "user" (user_id, society_id, email, password_hash, first_name, last_name, role, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', NOW(), NOW())
       ON CONFLICT (user_id) DO NOTHING`,
      [memberId, societyId, email, defaultHash, r['First Name'], r['Last Name'], role]
    );
    count++;
    if (count % 5000 === 0) console.log(`  ... ${count} members`);
  }
  await pool.query(`SELECT setval('user_user_id_seq', (SELECT MAX(user_id) FROM "user"))`);
  console.log(`  ✓ ${count} members imported`);
}

async function importDirtyMembers() {
  console.log('Importing + cleaning dirty.psv...');
  const rows = readPSV('dirty.psv');
  const defaultHash = await bcrypt.hash('password123', 10);

  const seen = new Set();
  let imported = 0;
  let skippedDup = 0;
  let fixed = 0;

  for (const r of rows) {
    const memberId = parseInt(r['MemberID']);

    // Skip duplicates
    if (seen.has(memberId)) { skippedDup++; continue; }
    seen.add(memberId);

    // Fix bad SocietyID (e.g., ".10" → "10")
    let societyId = r['SocietyID'];
    if (societyId && societyId.startsWith('.')) {
      societyId = societyId.substring(1);
      fixed++;
    }
    societyId = parseInt(societyId);

    // Fix missing role → default to 'member'
    let role = r['Role'] || null;
    if (!role || role.trim() === '') {
      role = 'member';
      fixed++;
    }

    const email = `${r['Username']}${memberId}@example.com`;

    // Use upsert — dirty data may overlap with clean members.psv
    await pool.query(
      `INSERT INTO "user" (user_id, society_id, email, password_hash, first_name, last_name, role, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', NOW(), NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         society_id = EXCLUDED.society_id,
         first_name = EXCLUDED.first_name,
         last_name = EXCLUDED.last_name,
         role = EXCLUDED.role`,
      [memberId, societyId, email, defaultHash, r['FirstName'], r['LastName'], role]
    );
    imported++;
  }
  await pool.query(`SELECT setval('user_user_id_seq', (SELECT MAX(user_id) FROM "user"))`);
  console.log(`  ✓ ${imported} dirty members imported (${skippedDup} duplicates skipped, ${fixed} fields fixed)`);
}

async function importElections() {
  console.log('Importing elections...');
  const rows = readPSV('elections.psv');
  for (const r of rows) {
    await pool.query(
      `INSERT INTO election (election_id, society_id, name, start_date, end_date, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 'completed', NOW(), NOW())
       ON CONFLICT (election_id) DO NOTHING`,
      [parseInt(r['Election ID']), parseInt(r['Society ID']), r['Election Title'], r['Start Date'], r['End Date']]
    );
  }
  await pool.query(`SELECT setval('election_election_id_seq', (SELECT MAX(election_id) FROM election))`);
  console.log(`  ✓ ${rows.length} elections imported`);
}

async function importCandidates() {
  console.log('Importing offices and candidates...');
  const rows = readPSV('candidates.psv');

  const seenOffices = new Set();
  let officeCount = 0;
  let candidateCount = 0;

  for (const r of rows) {
    const officeId = parseInt(r['Office ID']);
    const electionId = parseInt(r['Election ID']);
    const candidateId = parseInt(r['Candidate ID']);

    // Insert office if not seen yet
    if (!seenOffices.has(officeId)) {
      await pool.query(
        `INSERT INTO office (office_id, election_id, title, votes_allowed, allow_write_in, display_order)
         VALUES ($1, $2, $3, $4, false, $5)
         ON CONFLICT (office_id) DO NOTHING`,
        [officeId, electionId, r['Office Name'], parseInt(r['Allowed Votes']), officeId]
      );
      seenOffices.add(officeId);
      officeCount++;
    }

    // Insert candidate
    const fullName = [r['Candidate First Name'], r['Candidate Last Name']].filter(Boolean).join(' ');
    await pool.query(
      `INSERT INTO candidate (candidate_id, office_id, name, title_position, biography, display_order)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (candidate_id) DO NOTHING`,
      [candidateId, officeId, fullName, r['Candidate Credentials'] || null, r['Candidate Bio'] || null, candidateId]
    );
    candidateCount++;
    if (candidateCount % 3000 === 0) console.log(`  ... ${candidateCount} candidates`);
  }
  await pool.query(`SELECT setval('office_office_id_seq', (SELECT MAX(office_id) FROM office))`);
  await pool.query(`SELECT setval('candidate_candidate_id_seq', (SELECT MAX(candidate_id) FROM candidate))`);
  console.log(`  ✓ ${officeCount} offices, ${candidateCount} candidates imported`);
}

async function importVotes() {
  console.log('Importing votes (this may take a few minutes)...');
  const rows = readPSV('votes.psv');

  // Group by (member_id, election_id) to create vote records, then candidate_vote for each row
  const voteMap = new Map(); // key: "memberId-electionId" → vote rows
  let skipped = 0;
  for (const r of rows) {
    const memberId = parseInt(r['Member ID']);
    const electionId = parseInt(r['Election ID']);
    const officeId = parseInt(r['Office ID']);
    const candidateId = parseInt(r['Candidate ID']);
    // Skip rows with bad/missing data
    if (isNaN(memberId) || isNaN(electionId) || isNaN(officeId) || isNaN(candidateId)) {
      skipped++;
      continue;
    }
    const key = `${r['Member ID']}-${r['Election ID']}`;
    if (!voteMap.has(key)) voteMap.set(key, []);
    voteMap.get(key).push(r);
  }
  if (skipped > 0) console.log(`  Skipped ${skipped} rows with bad data`);

  let voteId = 1;
  let candidateVoteCount = 0;

  for (const [key, voteRows] of voteMap) {
    const memberId = parseInt(voteRows[0]['Member ID']);
    const electionId = parseInt(voteRows[0]['Election ID']);

    // Insert vote record
    await pool.query(
      `INSERT INTO vote (vote_id, user_id, election_id, submitted_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (vote_id) DO NOTHING`,
      [voteId, memberId, electionId]
    );

    // Insert each candidate_vote
    for (const r of voteRows) {
      candidateVoteCount++;
      await pool.query(
        `INSERT INTO candidate_vote (candidate_vote_id, vote_id, office_id, candidate_id)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (candidate_vote_id) DO NOTHING`,
        [candidateVoteCount, voteId, parseInt(r['Office ID']), parseInt(r['Candidate ID'])]
      );
    }

    voteId++;
    if (voteId % 50000 === 0) console.log(`  ... ${voteId} vote records`);
  }

  await pool.query(`SELECT setval('vote_vote_id_seq', (SELECT MAX(vote_id) FROM vote))`);
  // candidate_vote uses a manual PK, so set it too
  console.log(`  ✓ ${voteId - 1} votes, ${candidateVoteCount} candidate_votes imported`);
}

// ─── MAIN ─────────────────────────────────────────────────

async function main() {
  console.log('=== Election Data Import ===\n');

  try {
    // Import in dependency order
    // await importSocieties();
    // await importMembers();
    // await importDirtyMembers();
    // await importElections();
    // await importCandidates();
    await importVotes();

    console.log('\n=== Import complete! ===');
  } catch (err) {
    console.error('Import failed:', err.message);
    console.error(err.stack);
  } finally {
    await pool.end();
  }
}

main();
