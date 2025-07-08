import React from 'react';

function Home() {
  return (
    <div className="container">
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <div className="text-center mb-5">
            <h1 className="display-4 text-primary">Student Profile & Goal Tracking System</h1>
            <p className="lead">
              Empowering educators to track student goals, interests, and skill levels 
              through comprehensive profiles and dynamic surveys.
            </p>
          </div>
          
          <div className="row">
            <div className="col-md-6 mb-4">
              <div className="card h-100">
                <div className="card-body text-center">
                  <h5 className="card-title">For Teachers</h5>
                  <p className="card-text">
                    Create and manage student profiles, design custom surveys, 
                    and gain insights into your students' goals and interests.
                  </p>
                  <a href="/register" className="btn btn-primary">Get Started</a>
                </div>
              </div>
            </div>
            
            <div className="col-md-6 mb-4">
              <div className="card h-100">
                <div className="card-body text-center">
                  <h5 className="card-title">For Students</h5>
                  <p className="card-text">
                    Build your profile, set your goals, showcase your skills, 
                    and participate in surveys to help your educators understand you better.
                  </p>
                  <a href="/login" className="btn btn-outline-primary">Sign In</a>
                </div>
              </div>
            </div>
          </div>
          
          <div className="row mt-5">
            <div className="col-12">
              <h3 className="text-center mb-4">Key Features</h3>
              <div className="row">
                <div className="col-md-4 mb-3">
                  <div className="text-center">
                    <h5>Profile Management</h5>
                    <p>Comprehensive student profiles with goals, skills, and interests</p>
                  </div>
                </div>
                <div className="col-md-4 mb-3">
                  <div className="text-center">
                    <h5>Dynamic Surveys</h5>
                    <p>Create and deploy customizable surveys for data collection</p>
                  </div>
                </div>
                <div className="col-md-4 mb-3">
                  <div className="text-center">
                    <h5>Resume Upload</h5>
                    <p>Upload and parse resumes to automatically populate profiles</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
