import React from 'react';

function Dashboard() {
  // Placeholder data
  const stats = {
    totalStudents: 0,
    completedSurveys: 0,
    activeGoals: 0,
    uploadedResumes: 0
  };

  return (
    <div className="container">
      <div className="row">
        <div className="col-12">
          <h1 className="mb-4">Dashboard</h1>
        </div>
      </div>
      
      <div className="row">
        <div className="col-md-3 mb-4">
          <div className="card dashboard-card">
            <div className="card-body">
              <h5 className="card-title">Total Students</h5>
              <div className="display-4">{stats.totalStudents}</div>
            </div>
          </div>
        </div>
        
        <div className="col-md-3 mb-4">
          <div className="card dashboard-card">
            <div className="card-body">
              <h5 className="card-title">Completed Surveys</h5>
              <div className="display-4">{stats.completedSurveys}</div>
            </div>
          </div>
        </div>
        
        <div className="col-md-3 mb-4">
          <div className="card dashboard-card">
            <div className="card-body">
              <h5 className="card-title">Active Goals</h5>
              <div className="display-4">{stats.activeGoals}</div>
            </div>
          </div>
        </div>
        
        <div className="col-md-3 mb-4">
          <div className="card dashboard-card">
            <div className="card-body">
              <h5 className="card-title">Uploaded Resumes</h5>
              <div className="display-4">{stats.uploadedResumes}</div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="row">
        <div className="col-lg-8 mb-4">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">Recent Activity</h5>
            </div>
            <div className="card-body">
              <p className="text-muted">No recent activity to display.</p>
              <p><em>Activity tracking will be implemented in future updates.</em></p>
            </div>
          </div>
        </div>
        
        <div className="col-lg-4 mb-4">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">Quick Actions</h5>
            </div>
            <div className="card-body">
              <div className="d-grid gap-2">
                <a href="/profile" className="btn btn-primary">View Profile</a>
                <a href="/surveys" className="btn btn-outline-primary">Manage Surveys</a>
                <button className="btn btn-outline-secondary" disabled>
                  Generate Report
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
