import React, { useEffect, useState } from 'react';
import { profileService } from '../services/api';

const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    department: '',
    position: '',
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await profileService.getProfile();
      setProfile(response.data);
      setFormData({
        first_name: response.data.first_name || '',
        last_name: response.data.last_name || '',
        department: response.data.department || '',
        position: response.data.position || '',
      });
    } catch (error) {
      console.error('Error loading profile:', error);
      setMessage({ type: 'error', text: 'Failed to load profile' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      await profileService.updateProfile(formData);
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setEditing(false);
      await loadProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({ type: 'error', text: 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setFormData({
      first_name: profile.first_name || '',
      last_name: profile.last_name || '',
      department: profile.department || '',
      position: profile.position || '',
    });
    setMessage({ type: '', text: '' });
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading your profile...</p>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-container">
        {/* Header */}
        <div className="profile-header">
          <div className="profile-avatar">
            {profile?.first_name?.charAt(0)}{profile?.last_name?.charAt(0)}
          </div>
          <div className="profile-header-info">
            <h1>{profile?.first_name} {profile?.last_name}</h1>
            <p className="profile-role">{profile?.role?.toUpperCase()}</p>
          </div>
          {!editing && (
            <button className="btn btn-primary" onClick={() => setEditing(true)}>
              ✏️ Edit Profile
            </button>
          )}
        </div>

        {/* Message Alert */}
        {message.text && (
          <div className={`alert alert-${message.type}`}>
            {message.text}
          </div>
        )}

        {/* Profile Content */}
        <div className="profile-content">
          {editing ? (
            <form onSubmit={handleSubmit} className="profile-form">
              <div className="form-section">
                <h2>Personal Information</h2>
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="first_name">First Name *</label>
                    <input
                      type="text"
                      id="first_name"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleChange}
                      required
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="last_name">Last Name *</label>
                    <input
                      type="text"
                      id="last_name"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleChange}
                      required
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="department">Department *</label>
                    <input
                      type="text"
                      id="department"
                      name="department"
                      value={formData.department}
                      onChange={handleChange}
                      required
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="position">Position *</label>
                    <input
                      type="text"
                      id="position"
                      name="position"
                      value={formData.position}
                      onChange={handleChange}
                      required
                      className="form-input"
                    />
                  </div>
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-success" disabled={saving}>
                  {saving ? '💾 Saving...' : '✅ Save Changes'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={handleCancel} disabled={saving}>
                  ❌ Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="profile-info">
              <div className="info-section">
                <h2>Personal Information</h2>
                <div className="info-grid">
                  <div className="info-item">
                    <label>First Name</label>
                    <div className="info-value">{profile?.first_name}</div>
                  </div>
                  <div className="info-item">
                    <label>Last Name</label>
                    <div className="info-value">{profile?.last_name}</div>
                  </div>
                  <div className="info-item">
                    <label>Department</label>
                    <div className="info-value">{profile?.department}</div>
                  </div>
                  <div className="info-item">
                    <label>Position</label>
                    <div className="info-value">{profile?.position}</div>
                  </div>
                </div>
              </div>

              <div className="info-section">
                <h2>Account Information</h2>
                <div className="info-grid">
                  <div className="info-item">
                    <label>Username</label>
                    <div className="info-value">{profile?.username}</div>
                  </div>
                  <div className="info-item">
                    <label>Email</label>
                    <div className="info-value">{profile?.email || 'Not set'}</div>
                  </div>
                  <div className="info-item">
                    <label>Role</label>
                    <div className="info-value">
                      <span className="role-badge">{profile?.role?.toUpperCase()}</span>
                    </div>
                  </div>
                  <div className="info-item">
                    <label>Hire Date</label>
                    <div className="info-value">
                      {profile?.hire_date ? new Date(profile.hire_date).toLocaleDateString() : 'Not set'}
                    </div>
                  </div>
                </div>
              </div>

              {profile?.supervisor_first_name && (
                <div className="info-section">
                  <h2>Reporting Structure</h2>
                  <div className="info-grid">
                    <div className="info-item">
                      <label>Reports To</label>
                      <div className="info-value">
                        {profile.supervisor_first_name} {profile.supervisor_last_name}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
