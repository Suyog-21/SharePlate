import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDB } from '../context/DBContext';
import { PlusCircle, Clock, MapPin, CheckCircle, Package } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const RestaurantDashboard = () => {
  const { user } = useAuth();
  const { posts, addPost } = useDB();
  
  const [isPosting, setIsPosting] = useState(false);
  const [foodType, setFoodType] = useState('');
  const [quantity, setQuantity] = useState('');
  const [deadlineHours, setDeadlineHours] = useState('2');
  const [instructions, setInstructions] = useState('');

  // Filter posts belonging to this restaurant
  const myPosts = posts.filter(p => p.restaurantId === user.uid);
  
  // Calculate impact
  const totalMeals = user.stats.totalDonations + myPosts.reduce((acc, p) => p.status === 'Completed' ? acc + p.quantity : acc, 0);
  const co2Reduced = totalMeals * 0.5; // approx 0.5kg CO2 per meal saved

  const handlePostFood = async (e) => {
    e.preventDefault();
    setIsPosting(true);
    try {
      await addPost({
        restaurantId: user.uid,
        restaurantName: user.name,
        foodType,
        quantity: parseInt(quantity, 10),
        pickupDeadline: new Date(Date.now() + parseInt(deadlineHours) * 60 * 60 * 1000).toISOString(),
        instructions,
        location: { lat: 19.0760 + (Math.random() * 0.01), lng: 72.8777 + (Math.random() * 0.01) } // Mock location near Mumbai
      });
      setFoodType('');
      setQuantity('');
      setInstructions('');
      setDeadlineHours('2');
    } catch (err) {
      console.error(err);
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="container mt-8 animate-fade-in">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '2rem' }}>
        
        {/* Sidebar / Impact */}
        <div>
          <div className="card mb-4 text-center">
            <h3>Impact Dashboard</h3>
            {/* <div className="mt-4">
              <p style={{ fontSize: '2rem', color: 'var(--primary-color)', fontWeight: 'bold', margin: 0 }}>{totalMeals}</p>
              <p className="text-secondary text-sm">Meals Saved</p>
            </div>
            <div className="mt-4">
              <p style={{ fontSize: '2rem', color: 'var(--success-color)', fontWeight: 'bold', margin: 0 }}>{co2Reduced} kg</p>
              <p className="text-secondary text-sm">Food Served</p>
            </div>
            <div className="mt-4">
              <p style={{ fontSize: '2rem', color: 'var(--warning-color)', fontWeight: 'bold', margin: 0 }}>{user.stats.reliabilityScore}</p>
              <p className="text-secondary text-sm">SharePlate Score</p>
            </div> */}
          </div>
        </div>

        {/* Main Content */}
        <div>
          {/* Post Form */}
          <div className="card mb-8">
            <h3 className="flex items-center gap-2 mb-4">
              <PlusCircle size={24} color="var(--primary-color)" />
              Post Surplus Food
            </h3>
            <form onSubmit={handlePostFood}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Food Type / Description</label>
                  <input type="text" className="form-control" value={foodType} onChange={e => setFoodType(e.target.value)} required placeholder="e.g. 10 Portions of Pasta" />
                </div>
                <div className="form-group">
                  <label className="form-label">Estimated Portions/Quantity</label>
                  <input type="number" className="form-control" value={quantity} onChange={e => setQuantity(e.target.value)} required min="1" placeholder="e.g. 10" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Pickup Deadline (Hours from now)</label>
                  <select className="form-control" value={deadlineHours} onChange={e => setDeadlineHours(e.target.value)}>
                    <option value="1">1 Hour</option>
                    <option value="2">2 Hours</option>
                    <option value="4">4 Hours</option>
                    <option value="8">End of Day (8 Hours)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Special Instructions</label>
                  <input type="text" className="form-control" value={instructions} onChange={e => setInstructions(e.target.value)} placeholder="e.g. Come to back door" />
                </div>
              </div>
              <button type="submit" className="btn btn-primary" disabled={isPosting}>
                {isPosting ? 'Posting...' : 'Post Food Now'}
              </button>
            </form>
          </div>

          {/* Active & Past Donations */}
          <h3>Your Donations</h3>
          <div className="mt-4" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {myPosts.length === 0 ? (
              <p className="text-muted">No donations yet. Post some food to get started!</p>
            ) : (
              myPosts.map(post => (
                <div key={post.id} className="card flex justify-between items-center" style={{ padding: '1rem 1.5rem' }}>
                  <div>
                    <h4 style={{ margin: 0 }} className="flex items-center gap-2">
                      <Package size={18} />
                      {post.foodType}
                      <span className={`badge ${post.status === 'Available' ? 'badge-success' : post.status === 'Claimed' ? 'badge-warning' : ''}`} style={{ fontSize: '0.75rem', marginLeft: '0.5rem' }}>
                        {post.status}
                      </span>
                    </h4>
                    <p className="text-secondary text-sm mt-1 mb-0 flex items-center gap-4">
                      <span className="flex items-center gap-1"><Clock size={14} /> Expires in {formatDistanceToNow(new Date(post.pickupDeadline))}</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted m-0">Qty: {post.quantity}</p>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default RestaurantDashboard;
