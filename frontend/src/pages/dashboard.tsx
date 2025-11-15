import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { challengesApi, vmApi, Challenge, VMInstance } from '@/lib/api';
import { isAuthenticated, removeToken } from '@/lib/auth';

export default function Dashboard() {
  const router = useRouter();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [activeVMs, setActiveVMs] = useState<Record<number, VMInstance>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    loadChallenges();
  }, [router]);

  const loadChallenges = async () => {
    try {
      const data = await challengesApi.getAll();
      setChallenges(data);
      
      // Check for active VMs
      for (const challenge of data) {
        try {
          const vm = await vmApi.getStatus(challenge.id);
          setActiveVMs(prev => ({ ...prev, [challenge.id]: vm }));
        } catch (err) {
          // No active VM for this challenge
        }
      }
    } catch (err: any) {
      setError('Failed to load challenges');
    } finally {
      setLoading(false);
    }
  };

  const handleStartChallenge = async (challengeId: number) => {
    try {
      const vm = await vmApi.start(challengeId);
      setActiveVMs(prev => ({ ...prev, [challengeId]: vm }));
      router.push(`/vm/${challengeId}`);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to start challenge');
    }
  };

  const handleLogout = () => {
    removeToken();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading challenges...</div>
      </div>
    );
  }

  return (
    <>
      <div className="header">
        <div className="container">
          <h1>CyberBros Lab</h1>
        </div>
      </div>
      <div className="container">
        <div className="user-info">
          <span>Welcome to the lab!</span>
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </div>

        {error && <div className="error">{error}</div>}

        <h2 style={{ color: '#00ff41', marginBottom: '20px' }}>Available Challenges</h2>

        <div className="challenge-grid">
          {challenges.map((challenge) => {
            const activeVM = activeVMs[challenge.id];
            
            return (
              <div key={challenge.id} className="challenge-card">
                <h3>{challenge.name}</h3>
                <span className={`difficulty ${challenge.difficulty}`}>
                  {challenge.difficulty.toUpperCase()}
                </span>
                <p>{challenge.description}</p>
                <p style={{ fontSize: '0.9rem', color: '#666' }}>
                  {challenge.cpu_count} vCPU, {challenge.memory_gb}GB RAM
                </p>
                
                {activeVM ? (
                  <button
                    onClick={() => router.push(`/vm/${challenge.id}`)}
                    className="btn"
                    style={{ marginTop: '10px' }}
                  >
                    View Running VM
                  </button>
                ) : (
                  <button
                    onClick={() => handleStartChallenge(challenge.id)}
                    className="btn"
                    style={{ marginTop: '10px' }}
                  >
                    Start Challenge
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
