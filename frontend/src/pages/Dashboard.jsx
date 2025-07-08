import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

function Dashboard() {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [stats, setStats] = useState({
    goals: 0,
    skills: 0,
    interests: 0,
    completedGoals: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch profile data
      const profileResponse = await axios.get(`/profiles/${user.id}`);
      setProfileData(profileResponse.data.profile);

      // Calculate stats from profile data
      const profile = profileResponse.data.profile;
      const completedGoals = profile.goals.filter(goal => goal.status === 'completed').length;

      setStats({
        goals: profile.goals.length,
        skills: profile.skills.length,
        interests: profile.interests.length,
        completedGoals
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mt-4">
        <div className="d-flex justify-content-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  const profileCompletion = profileData?.studentProfile?.profileCompletion || 0;

  return (
    <div className="container mt-4">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h1 className="mb-1">
                Welcome back, {user?.firstName}!
                <span className="badge bg-secondary ms-2 fs-6">{user?.role}</span>
              </h1>
              <p className="text-muted mb-0">Here's your profile overview</p>
            </div>
            <Link to="/profile" className="btn btn-primary">
              <i className="bi bi-person me-2"></i>
              View Profile
            </Link>
          </div>

          {/* Profile Completion Alert */}
          {profileCompletion < 80 && (
            <div className="alert alert-info alert-dismissible fade show" role="alert">
              <i className="bi bi-info-circle me-2"></i>
              <strong>Complete your profile!</strong> You're {profileCompletion}% done.
              <Link to="/profile" className="alert-link ms-1">Add more information</Link> to help us personalize your experience.
              <button type="button" className="btn-close" data-bs-dismiss="alert"></button>
            </div>
          )}

          {/* Stats Cards */}
          <div className="row mb-4">
            <div className="col-md-3 col-sm-6 mb-3">
              <div className="card border-primary">
                <div className="card-body text-center">
                  <i className="bi bi-person-circle text-primary fs-1"></i>
                  <h5 className="card-title mt-2">Profile</h5>
                  <div className="progress mb-2">
                    <div
                      className="progress-bar bg-primary"
                      role="progressbar"
                      style={{ width: `${profileCompletion}%` }}
                    >
                      {profileCompletion}%
                    </div>
                  </div>
                  <small className="text-muted">Completion</small>
                </div>
              </div>
            </div>

            <div className="col-md-3 col-sm-6 mb-3">
              <div className="card border-success">
                <div className="card-body text-center">
                  <i className="bi bi-bullseye text-success fs-1"></i>
                  <h5 className="card-title mt-2">Goals</h5>
                  <h3 className="text-success mb-1">{stats.goals}</h3>
                  <small className="text-muted">
                    {stats.completedGoals} completed
                  </small>
                </div>
              </div>
            </div>

            <div className="col-md-3 col-sm-6 mb-3">
              <div className="card border-warning">
                <div className="card-body text-center">
                  <i className="bi bi-gear text-warning fs-1"></i>
                  <h5 className="card-title mt-2">Skills</h5>
                  <h3 className="text-warning mb-1">{stats.skills}</h3>
                  <small className="text-muted">Added to profile</small>
                </div>
              </div>
            </div>

            <div className="col-md-3 col-sm-6 mb-3">
              <div className="card border-info">
                <div className="card-body text-center">
                  <i className="bi bi-heart text-info fs-1"></i>
                  <h5 className="card-title mt-2">Interests</h5>
                  <h3 className="text-info mb-1">{stats.interests}</h3>
                  <small className="text-muted">Areas of interest</small>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="row">
            <div className="col-md-4 mb-3">
              <div className="card h-100">
                <div className="card-body">
                  <h5 className="card-title">
                    <i className="bi bi-upload me-2"></i>
                    Upload Resume
                  </h5>
                  <p className="card-text">
                    Upload your resume to automatically populate your profile with skills and experience.
                  </p>
                  <Link to="/profile?tab=files" className="btn btn-primary">
                    Upload Resume
                  </Link>
                </div>
              </div>
            </div>

            <div className="col-md-4 mb-3">
              <div className="card h-100">
                <div className="card-body">
                  <h5 className="card-title">
                    <i className="bi bi-plus-circle me-2"></i>
                    Add Goals
                  </h5>
                  <p className="card-text">
                    Set academic and personal goals to track your progress throughout the semester.
                  </p>
                  <Link to="/profile?tab=goals" className="btn btn-success">
                    Add Goals
                  </Link>
                </div>
              </div>
            </div>

            <div className="col-md-4 mb-3">
              <div className="card h-100">
                <div className="card-body">
                  <h5 className="card-title">
                    <i className="bi bi-clipboard-check me-2"></i>
                    Take Surveys
                  </h5>
                  <p className="card-text">
                    Complete surveys to help your teachers understand your learning preferences.
                  </p>
                  <Link to="/surveys" className="btn btn-info">
                    View Surveys
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
