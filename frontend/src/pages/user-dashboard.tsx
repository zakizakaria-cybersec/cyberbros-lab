import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { userApi, Assignment } from '../lib/api';
import { getUser, isAuthenticated } from '../lib/auth';

export default function UserDashboard() {
  const router = useRouter();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<number | null>(null);
  const [credentials, setCredentials] = useState<any>(null);

  useEffect(() => {
    const user = getUser();
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    
    if (user?.role === 'admin') {
      router.push('/admin');
      return;
    }
    
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await userApi.getAssignments();
      setAssignments(data.data || data);
    } catch (error) {
      console.error('Failed to load assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const startChallenge = async (challengeId: number) => {
    setStarting(challengeId);
    try {
      const result = await userApi.startChallenge(challengeId);
      alert('VM provisioning started! Refresh in a moment to see status.');
      await loadData();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to start challenge');
    } finally {
      setStarting(null);
    }
  };

  const showCredentials = async (instanceId: number) => {
    try {
      const creds = await userApi.getVMCredentials(instanceId);
      setCredentials(creds);
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to get credentials');
    }
  };

  const user = getUser();

  if (loading) return <div className="container">Loading...</div>;

  return (
    <div className="container">
      <style jsx>{`
        .container { padding: 2rem; max-width: 1200px; margin: 0 auto; }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
        h1 { color: #00ff00; }
        .logout-btn { background: #ff3333; color: white; padding: 0.5rem 1rem; border: none; border-radius: 4px; cursor: pointer; }
        .assignments-grid { display: grid; gap: 1.5rem; }
        .assignment-card { background: #1a1a1a; border: 1px solid #333; border-radius: 8px; padding: 1.5rem; }
        .assignment-card.active { border-color: #00ff00; background: #1a3a1a; }
        .assignment-card h3 { color: #00ff00; margin-top: 0; }
        .assignment-card p { color: #ccc; line-height: 1.6; }
        .badge { display: inline-block; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.8rem; font-weight: bold; margin-right: 0.5rem; }
        .badge.beginner { background: #00ff00; color: black; }
        .badge.intermediate { background: #ff9900; color: black; }
        .badge.advanced { background: #ff3333; color: white; }
        .status-badge { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.8rem; font-weight: bold; }
        .status-badge.assigned { background: #444; }
        .status-badge.in_progress { background: #ff9900; color: black; }
        .status-badge.completed { background: #00ff00; color: black; }
        button { background: #00ff00; color: black; padding: 0.75rem 1.5rem; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; margin-top: 1rem; margin-right: 0.5rem; }
        button:hover { background: #00cc00; }
        button:disabled { background: #666; cursor: not-allowed; }
        button.secondary { background: #333; color: white; }
        button.secondary:hover { background: #444; }
        .vm-info { background: #0a0a0a; padding: 1rem; border-radius: 4px; margin-top: 1rem; font-family: monospace; font-size: 0.9rem; }
        .vm-info div { margin: 0.5rem 0; }
        .credentials-modal { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #1a1a1a; border: 2px solid #00ff00; border-radius: 8px; padding: 2rem; z-index: 1000; max-width: 500px; width: 90%; }
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.8); z-index: 999; }
        .empty-state { text-align: center; padding: 3rem; color: #888; }
        .meta-info { color: #888; font-size: 0.9rem; margin-top: 0.5rem; }
      `}</style>

      <div className="header">
        <div>
          <h1>🎯 My Challenges</h1>
          <p>Welcome, {user?.email}</p>
        </div>
        <button className="logout-btn" onClick={() => { localStorage.clear(); router.push('/login'); }}>
          Logout
        </button>
      </div>

      {assignments.length === 0 ? (
        <div className="empty-state">
          <h2>No Challenges Assigned</h2>
          <p>Your admin hasn't assigned any challenges to you yet.</p>
        </div>
      ) : (
        <div className="assignments-grid">
          {assignments.map((assignment) => (
            <div key={assignment.id} className={`assignment-card ${assignment.status === 'in_progress' ? 'active' : ''}`}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'start'}}>
                <h3>{assignment.challenge_name}</h3>
                <span className={`status-badge ${assignment.status}`}>
                  {assignment.status.replace('_', ' ')}
                </span>
              </div>
              
              <div>
                <span className={`badge ${assignment.challenge_difficulty}`}>
                  {assignment.challenge_difficulty}
                </span>
                <span style={{color: '#888'}}>⏱️ {assignment.challenge_duration_hours}h duration</span>
              </div>
              
              <p>{assignment.challenge_description}</p>
              
              {assignment.notes && <div className="meta-info">📝 Note: {assignment.notes}</div>}
              <div className="meta-info">Assigned: {new Date(assignment.assigned_at).toLocaleDateString()}</div>

              {assignment.has_active_vm && assignment.vm_instance_id && (
                <div className="vm-info">
                  <div><strong>✓ VM Active</strong></div>
                  <div>Status: {assignment.vm_status}</div>
                  {assignment.vm_public_ip && <div>IP: {assignment.vm_public_ip}</div>}
                  {assignment.vm_expires_at && <div>Expires: {new Date(assignment.vm_expires_at).toLocaleString()}</div>}
                  <button className="secondary" onClick={() => showCredentials(assignment.vm_instance_id!)}>
                    Show SSH Credentials
                  </button>
                </div>
              )}

              {assignment.status === 'assigned' && !assignment.has_active_vm && (
                <button onClick={() => startChallenge(assignment.challenge_id)} disabled={starting === assignment.challenge_id}>
                  {starting === assignment.challenge_id ? 'Starting VM...' : 'Start Challenge'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {credentials && (
        <>
          <div className="modal-overlay" onClick={() => setCredentials(null)} />
          <div className="credentials-modal">
            <h2 style={{color: '#00ff00', marginTop: 0}}>SSH Credentials</h2>
            <div className="vm-info">
              <div><strong>IP:</strong> {credentials.public_ip}</div>
              <div><strong>Username:</strong> {credentials.ssh_username}</div>
              <div><strong>Password:</strong> {credentials.ssh_password}</div>
              <div style={{marginTop: '1rem', color: '#ff9900'}}>⚠️ {credentials.message}</div>
            </div>
            <div style={{marginTop: '1rem', fontFamily: 'monospace', background: '#0a0a0a', padding: '1rem', borderRadius: '4px'}}>
              <div>$ ssh {credentials.ssh_username}@{credentials.public_ip}</div>
            </div>
            <button onClick={() => setCredentials(null)} style={{width: '100%'}}>Close</button>
          </div>
        </>
      )}
    </div>
  );
}
