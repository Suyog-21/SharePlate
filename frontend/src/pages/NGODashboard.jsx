import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDB } from '../context/DBContext';
import { MapPin, Clock, Package, CheckCircle, Navigation } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const NGODashboard = () => {
  const { user } = useAuth();
  const { posts, updatePostStatus } = useDB();
  const [claimingId, setClaimingId] = useState(null);

  // Available posts for NGO to claim
  const availablePosts = posts.filter(p => p.status === 'Available');
  
  // Posts claimed by this NGO
  const myClaims = posts.filter(p => p.claimedByNgoId === user.uid && p.status !== 'Completed');

  const handleClaim = async (postId) => {
    setClaimingId(postId);
    try {
      await updatePostStatus(postId, 'Claimed', user.uid);
    } catch (err) {
      console.error(err);
    } finally {
      setClaimingId(null);
    }
  };

  const handleMarkCompleted = async (postId) => {
    try {
      await updatePostStatus(postId, 'Completed');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="container mt-8 animate-fade-in">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '2rem' }}>
        
        {/* Sidebar / NGO Stats */}
        <div>
          <div className="card mb-4 text-center">
            <h3>NGO Profile</h3>
            <p className="text-secondary mb-4">{user.name}</p>
            {/* <div className="mt-4">
              <p style={{ fontSize: '2rem', color: 'var(--success-color)', fontWeight: 'bold', margin: 0 }}>{user.stats.pickupsCompleted}</p>
              <p className="text-secondary text-sm">Pickups Completed</p>
            </div> */}
            {/* <div className="mt-4">
              <p style={{ fontSize: '2rem', color: 'var(--warning-color)', fontWeight: 'bold', margin: 0 }}>{user.stats.reliabilityScore}</p>
              <p className="text-secondary text-sm">Reliability Score</p>
            </div> */}
          </div>

          {/* Active Claims */}
          <div className="card">
            <h4 className="mb-4 flex items-center gap-2"><Navigation size={18} /> Active Claims</h4>
            {myClaims.length === 0 ? (
              <p className="text-sm text-muted">No active claims.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {myClaims.map(claim => (
                  <div key={claim.id} style={{ borderLeft: '3px solid var(--warning-color)', paddingLeft: '1rem' }}>
                    <p className="font-bold mb-1" style={{ fontSize: '0.9rem' }}>{claim.restaurantName}</p>
                    <p className="text-xs text-secondary mb-2">{claim.foodType}</p>
                    <button 
                      className="btn btn-outline w-full" 
                      style={{ fontSize: '0.8rem', padding: '0.25rem' }}
                      onClick={() => handleMarkCompleted(claim.id)}
                    >
                      Mark Picked Up
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Content / Real-time Feed */}
        <div>
          <h3 className="mb-4">Live Food Feed</h3>
          {availablePosts.length === 0 ? (
            <div className="card text-center" style={{ padding: '3rem' }}>
              <Package size={48} color="var(--text-muted)" style={{ margin: '0 auto 1rem auto' }} />
              <p className="text-muted">No food currently available in your area. Check back soon!</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {availablePosts.map(post => (
                <div key={post.id} className="card flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h4 style={{ margin: 0 }}>{post.restaurantName}</h4>
                      <span className="badge badge-success">Available</span>
                    </div>
                    <p className="text-secondary font-bold mb-2">{post.foodType}</p>
                    <p className="text-sm text-muted mb-4">Quantity: {post.quantity} portions</p>
                    
                    <div className="text-xs text-secondary flex flex-col gap-2 mb-4">
                      <span className="flex items-center gap-1"><Clock size={14} /> Expires in {formatDistanceToNow(new Date(post.pickupDeadline))}</span>
                      <span className="flex items-center gap-1"><MapPin size={14} /> ~2.4 km away</span>
                    </div>
                  </div>
                  
                  <button 
                    className="btn btn-primary w-full" 
                    onClick={() => handleClaim(post.id)}
                    disabled={claimingId === post.id}
                  >
                    {claimingId === post.id ? 'Claiming...' : 'Claim Food'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NGODashboard;
