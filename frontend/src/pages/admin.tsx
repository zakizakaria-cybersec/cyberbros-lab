import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { adminApi, userApi, User, Challenge, Assignment } from '../lib/api';
import { getToken, getUser, isAuthenticated } from '../lib/auth';

export default function AdminDashboard() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [selectedChallenge, setSelectedChallenge] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [showCreateChallenge, setShowCreateChallenge] = useState(false);
  const [newChallenge, setNewChallenge] = useState({
    name: '',
    description: '',
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    cpu_count: 2,
    memory_gb: 2,
  });

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    
    const user = getUser();
    if (!user || user.role !== 'admin') {
      router.push('/login');
      return;
    }
    
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [usersData, challengesData, assignmentsData] = await Promise.all([
        adminApi.getUsers(),
        adminApi.getChallenges(),
        adminApi.getAssignments(),
      ]);
      setUsers(usersData.data || usersData);
      setChallenges(challengesData.data || challengesData);
      setAssignments(assignmentsData.data || assignmentsData);
    } catch (error: any) {
      console.error('Failed to load data:', error);
      if (error.response) {
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
      }
      setMessage('Failed to load data: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleUserToggle = (userId: number) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleBulkAssign = async () => {
    if (selectedUsers.length === 0 || !selectedChallenge) {
      setMessage('Please select users and a challenge');
      return;
    }

    try {
      const result = await adminApi.bulkCreateAssignments(
        selectedUsers,
        selectedChallenge,
        notes
      );
      setMessage(`✓ Assigned to ${result.created || selectedUsers.length} users`);
      setSelectedUsers([]);
      setSelectedChallenge(null);
      setNotes('');
      loadData();
    } catch (error: any) {
      setMessage('Failed to assign: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleCreateChallenge = async () => {
    if (!newChallenge.name || !newChallenge.description) {
      setMessage('Please fill in challenge name and description');
      return;
    }

    try {
      await adminApi.createChallenge(newChallenge);
      setMessage('✓ Challenge created successfully');
      setShowCreateChallenge(false);
      setNewChallenge({
        name: '',
        description: '',
        difficulty: 'medium',
        cpu_count: 2,
        memory_gb: 2,
      });
      loadData();
    } catch (error: any) {
      setMessage('Failed to create challenge: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleDeleteChallenge = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this challenge?')) return;
    try {
      await adminApi.deleteChallenge(id);
      setMessage('✓ Challenge deleted');
      loadData();
    } catch (error: any) {
      setMessage('Failed to delete challenge: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleDeleteAssignment = async (id: number) => {
    if (!confirm('Are you sure you want to delete this assignment?')) return;
    try {
      await adminApi.deleteAssignment(id);
      setMessage('✓ Assignment deleted');
      loadData();
    } catch (error: any) {
      setMessage('Failed to delete assignment: ' + (error.response?.data?.error || error.message));
    }
  };

  if (loading) return <div className="container">Loading...</div>;

  return (
    <div className="container">
      <style jsx>{`
        .container {
          padding: 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }
        h1 { color: #00ff00; margin-bottom: 2rem; }
        h2 { color: #00ff00; margin-top: 2rem; }
        .section {
          background: #1a1a1a;
          padding: 1.5rem;
          margin-bottom: 2rem;
          border-radius: 8px;
          border: 1px solid #333;
        }
        .user-list, .challenge-list {
          display: grid;
          gap: 0.5rem;
        }
        .user-item, .challenge-item {
          padding: 1rem;
          background: #2a2a2a;
          border-radius: 4px;
          cursor: pointer;
          border: 2px solid transparent;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .user-item.selected, .challenge-item.selected {
          border-color: #00ff00;
          background: #1a3a1a;
        }
        .user-item:hover, .challenge-item:hover {
          background: #333;
        }
        .badge {
          background: #00ff00;
          color: black;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.8rem;
          font-weight: bold;
        }
        .badge.admin { background: #ff6600; }
        button {
          background: #00ff00;
          color: black;
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
          font-size: 1rem;
        }
        button:hover { background: #00cc00; }
        button:disabled {
          background: #666;
          cursor: not-allowed;
        }
        .delete-btn {
          background: #ff3333;
          padding: 0.25rem 0.5rem;
          font-size: 0.8rem;
          margin-left: 1rem;
        }
        .delete-btn:hover {
          background: #cc0000;
        }
        textarea {
          width: 100%;
          padding: 0.75rem;
          background: #2a2a2a;
          border: 1px solid #444;
          border-radius: 4px;
          color: white;
          font-family: inherit;
          resize: vertical;
        }
        .message {
          padding: 1rem;
          background: #1a3a1a;
          border: 1px solid #00ff00;
          border-radius: 4px;
          margin-bottom: 1rem;
        }
        .assignments-table {
          width: 100%;
          border-collapse: collapse;
        }
        .assignments-table th,
        .assignments-table td {
          padding: 0.75rem;
          text-align: left;
          border-bottom: 1px solid #333;
        }
        .assignments-table th {
          background: #2a2a2a;
          color: #00ff00;
        }
        .status {
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.8rem;
          font-weight: bold;
        }
        .status.assigned { background: #444; }
        .status.in_progress { background: #ff6600; color: black; }
        .status.completed { background: #00ff00; color: black; }
        .logout-btn {
          position: absolute;
          top: 1rem;
          right: 1rem;
          background: #ff3333;
        }
        .create-challenge-btn {
          background: #0066ff;
          margin-bottom: 1rem;
        }
        .modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.85);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal-content {
          background: #1a1a1a;
          padding: 2rem;
          border-radius: 8px;
          border: 1px solid #00ff00;
          max-width: 600px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
        }
        .form-group {
          margin-bottom: 1.5rem;
        }
        .form-group label {
          display: block;
          color: #00ff00;
          margin-bottom: 0.5rem;
          font-weight: bold;
        }
        .form-group input,
        .form-group select {
          width: 100%;
          padding: 0.75rem;
          background: #2a2a2a;
          border: 1px solid #444;
          border-radius: 4px;
          color: white;
          font-family: inherit;
        }
        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #00ff00;
        }
        .form-actions {
          display: flex;
          gap: 1rem;
          margin-top: 2rem;
        }
        .form-actions button {
          flex: 1;
        }
        .cancel-btn {
          background: #666;
        }
        .cancel-btn:hover {
          background: #555;
        }
      `}</style>

      <button className="logout-btn" onClick={() => {
        localStorage.clear();
        router.push('/login');
      }}>
        Logout
      </button>

      <h1>🔧 Admin Dashboard</h1>

      {message && <div className="message">{message}</div>}

      <div className="section">
        <h2>1. Select Users ({selectedUsers.length} selected)</h2>
        <div className="user-list">
          {users.length === 0 ? (
            <div style={{padding: '1rem', color: '#aaa'}}>No users found</div>
          ) : (
            users.map(user => (
              <div
                key={user.id}
                className={`user-item ${selectedUsers.includes(user.id) ? 'selected' : ''}`}
                onClick={() => handleUserToggle(user.id)}
              >
                <span>{user.email}</span>
                <span className={`badge ${user.role === 'admin' ? 'admin' : ''}`}>{user.role}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="section">
        <h2>2. Select Challenge</h2>
        <button 
          className="create-challenge-btn"
          onClick={() => setShowCreateChallenge(true)}
        >
          + Create New Challenge
        </button>
        <div className="challenge-list">
          {challenges.map(challenge => (
            <div
              key={challenge.id}
              className={`challenge-item ${selectedChallenge === challenge.id ? 'selected' : ''}`}
              onClick={() => setSelectedChallenge(challenge.id)}
            >
              <div style={{flex: 1}}>
                <strong>{challenge.name}</strong>
                <div style={{fontSize: '0.9rem', color: '#aaa', marginTop: '0.25rem'}}>
                  {challenge.description.substring(0, 100)}...
                </div>
              </div>
              <div style={{display: 'flex', alignItems: 'center'}}>
                <span className="badge">{challenge.difficulty}</span>
                <button 
                  className="delete-btn"
                  onClick={(e) => handleDeleteChallenge(challenge.id, e)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="section">
        <h2>3. Add Notes (Optional)</h2>
        <textarea
          rows={3}
          placeholder="Add notes for this assignment..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <button
        onClick={handleBulkAssign}
        disabled={selectedUsers.length === 0 || !selectedChallenge}
      >
        Assign Challenge to {selectedUsers.length} User{selectedUsers.length !== 1 ? 's' : ''}
      </button>

      <div className="section" style={{marginTop: '3rem'}}>
        <h2>Recent Assignments</h2>
        <table className="assignments-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Challenge</th>
              <th>Status</th>
              <th>Assigned</th>
              <th>Notes</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {assignments.slice(0, 10).map((assignment: any) => (
              <tr key={assignment.id}>
                <td>{assignment.user_email}</td>
                <td>{assignment.challenge_name}</td>
                <td>
                  <span className={`status ${assignment.status}`}>
                    {assignment.status.replace('_', ' ')}
                  </span>
                </td>
                <td>{new Date(assignment.assigned_at).toLocaleDateString()}</td>
                <td>{assignment.notes || '-'}</td>
                <td>
                  <button 
                    className="delete-btn"
                    onClick={() => handleDeleteAssignment(assignment.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreateChallenge && (
        <div className="modal" onClick={() => setShowCreateChallenge(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Create New Challenge</h2>
            
            <div className="form-group">
              <label>Challenge Name *</label>
              <input
                type="text"
                value={newChallenge.name}
                onChange={(e) => setNewChallenge({ ...newChallenge, name: e.target.value })}
                placeholder="e.g., SQL Injection Lab"
              />
            </div>

            <div className="form-group">
              <label>Description *</label>
              <textarea
                rows={4}
                value={newChallenge.description}
                onChange={(e) => setNewChallenge({ ...newChallenge, description: e.target.value })}
                placeholder="Detailed description of the challenge..."
              />
            </div>

            <div className="form-group">
              <label>Difficulty *</label>
              <select
                value={newChallenge.difficulty}
                onChange={(e) => setNewChallenge({ ...newChallenge, difficulty: e.target.value as 'easy' | 'medium' | 'hard' })}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            <div className="form-group">
              <label>CPU Cores</label>
              <input
                type="number"
                min="1"
                max="8"
                value={newChallenge.cpu_count}
                onChange={(e) => setNewChallenge({ ...newChallenge, cpu_count: parseInt(e.target.value) })}
              />
            </div>

            <div className="form-group">
              <label>Memory (GB)</label>
              <input
                type="number"
                min="1"
                max="16"
                value={newChallenge.memory_gb}
                onChange={(e) => setNewChallenge({ ...newChallenge, memory_gb: parseInt(e.target.value) })}
              />
            </div>

            <div className="form-actions">
              <button className="cancel-btn" onClick={() => setShowCreateChallenge(false)}>
                Cancel
              </button>
              <button onClick={handleCreateChallenge}>
                Create Challenge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
