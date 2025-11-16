import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { vmApi, challengesApi, VMInstance, Challenge } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';
import CountdownTimer from '@/components/CountdownTimer';

export default function VMDetails() {
  const router = useRouter();
  const { challengeId } = router.query;
  const [vm, setVm] = useState<VMInstance | null>(null);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    if (challengeId) {
      loadVMDetails();
      
      // Poll for updates every 10 seconds
      const interval = setInterval(loadVMDetails, 10000);
      return () => clearInterval(interval);
    }
  }, [challengeId, router]);

  const loadVMDetails = async () => {
    try {
      const cId = parseInt(challengeId as string);
      const [vmData, challenges] = await Promise.all([
        vmApi.getStatus(cId),
        challengesApi.getAll(),
      ]);
      
      setVm(vmData);
      const challengeData = challenges.find(c => c.id === cId);
      setChallenge(challengeData || null);
    } catch (err: any) {
      setError('Failed to load VM details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading VM details...</div>
      </div>
    );
  }

  if (error || !vm || !challenge) {
    return (
      <div className="container">
        <div className="error">{error || 'VM not found'}</div>
        <div className="nav-links">
          <Link href="/dashboard">Back to Dashboard</Link>
        </div>
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
        <div className="vm-details">
          <h2>{challenge.name}</h2>
          
          <div style={{ marginBottom: '30px' }}>
            <CountdownTimer expiresAt={vm.expires_at} />
          </div>

          <div className="vm-info">
            <div className="vm-info-item">
              <label>Status:</label>
              <span style={{ color: vm.status === 'running' ? '#00ff41' : '#f57c00' }}>
                {vm.status.toUpperCase()}
              </span>
            </div>
            <div className="vm-info-item">
              <label>IP Address:</label>
              <span>{vm.ip_address || 'Provisioning...'}</span>
            </div>
            <div className="vm-info-item">
              <label>SSH Port:</label>
              <span>{vm.ssh_port || 'N/A'}</span>
            </div>
            {vm.ssh_password && (
              <div className="vm-info-item">
                <label>SSH Password:</label>
                <span>{vm.ssh_password}</span>
              </div>
            )}
          </div>

          <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#0a0a0a', borderRadius: '4px' }}>
            <h3 style={{ color: '#00ff41', marginBottom: '10px' }}>Connection Command</h3>
            <pre style={{ color: '#e0e0e0', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
              ssh root@{vm.ip_address}{vm.ssh_port && vm.ssh_port !== 22 ? ` -p ${vm.ssh_port}` : ''}
            </pre>
            {vm.ssh_password && (
              <p style={{ color: '#b0b0b0', marginTop: '10px', fontSize: '0.9rem' }}>
                Use password: {vm.ssh_password}
              </p>
            )}
          </div>

          <div style={{ marginTop: '30px' }}>
            <Link href="/dashboard">
              <button className="btn">Back to Dashboard</button>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
