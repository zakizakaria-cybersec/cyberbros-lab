import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Challenge from '../models/Challenge';

dotenv.config();

const sampleChallenges = [
  {
    title: 'SQL Injection 101',
    description: 'Learn the basics of SQL injection attacks. Your goal is to bypass the login form and access the admin panel.',
    difficulty: 'beginner',
    category: 'Web Security',
    points: 100,
    vmConfig: {
      imageId: 'ubuntu-20.04',
      serverType: 'cx11',
      location: 'nbg1'
    },
    flags: ['FLAG{sql_1nj3ct10n_m4st3r}'],
    hints: [
      'Try using OR 1=1 in the username field',
      'Look for authentication bypass techniques'
    ]
  },
  {
    title: 'Basic Buffer Overflow',
    description: 'Exploit a simple buffer overflow vulnerability to gain control of program execution.',
    difficulty: 'intermediate',
    category: 'Binary Exploitation',
    points: 250,
    vmConfig: {
      imageId: 'ubuntu-20.04',
      serverType: 'cx21',
      location: 'nbg1'
    },
    flags: ['FLAG{buff3r_0v3rfl0w_pwn3d}'],
    hints: [
      'Find the offset to overwrite the return address',
      'Use pattern_create to determine the exact offset'
    ]
  },
  {
    title: 'Cross-Site Scripting (XSS)',
    description: 'Identify and exploit XSS vulnerabilities in a web application to steal session cookies.',
    difficulty: 'beginner',
    category: 'Web Security',
    points: 150,
    vmConfig: {
      imageId: 'ubuntu-20.04',
      serverType: 'cx11',
      location: 'nbg1'
    },
    flags: ['FLAG{xss_c00k13_st34l3r}'],
    hints: [
      'Look for user input that gets reflected in the page',
      'Try injecting script tags'
    ]
  },
  {
    title: 'Linux Privilege Escalation',
    description: 'Start as a low-privileged user and escalate to root access by exploiting misconfigurations.',
    difficulty: 'advanced',
    category: 'System Security',
    points: 400,
    vmConfig: {
      imageId: 'ubuntu-20.04',
      serverType: 'cx21',
      location: 'nbg1'
    },
    flags: ['FLAG{r00t_4cc3ss_gr4nt3d}'],
    hints: [
      'Check for SUID binaries',
      'Look for sudo misconfigurations'
    ]
  },
  {
    title: 'Cryptography Challenge',
    description: 'Decrypt an encrypted message using various cryptographic techniques.',
    difficulty: 'intermediate',
    category: 'Cryptography',
    points: 300,
    vmConfig: {
      imageId: 'ubuntu-20.04',
      serverType: 'cx11',
      location: 'nbg1'
    },
    flags: ['FLAG{crypt0_m4st3r_h4ck3r}'],
    hints: [
      'Analyze the encryption algorithm',
      'Look for weak key generation'
    ]
  }
];

const seedDatabase = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/cyberbros-lab';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Clear existing challenges
    await Challenge.deleteMany({});
    console.log('🗑️  Cleared existing challenges');

    // Insert sample challenges
    const challenges = await Challenge.insertMany(sampleChallenges);
    console.log(`✅ Seeded ${challenges.length} challenges`);

    challenges.forEach(challenge => {
      console.log(`  - ${challenge.title} (${challenge.difficulty})`);
    });

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  }
};

seedDatabase();
