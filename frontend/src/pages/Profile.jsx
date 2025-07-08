import React from 'react';

function Profile() {
  return (
    <div className="container">
      <div className="row">
        <div className="col-12">
          <h1 className="mb-4">Student Profile</h1>
        </div>
      </div>
      
      <div className="row">
        <div className="col-lg-4 mb-4">
          <div className="card">
            <div className="card-body text-center">
              <div className="mb-3">
                <div className="bg-primary rounded-circle d-inline-flex align-items-center justify-content-center" 
                     style={{width: '80px', height: '80px'}}>
                  <span className="text-white fs-2">👤</span>
                </div>
              </div>
              <h5 className="card-title">Profile Photo</h5>
              <p className="text-muted">Upload a profile photo</p>
              <button className="btn btn-outline-primary btn-sm">Upload Photo</button>
            </div>
          </div>
        </div>
        
        <div className="col-lg-8 mb-4">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">Basic Information</h5>
            </div>
            <div className="card-body">
              <form>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">First Name</label>
                    <input type="text" className="form-control" placeholder="Enter first name" />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Last Name</label>
                    <input type="text" className="form-control" placeholder="Enter last name" />
                  </div>
                </div>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Email</label>
                    <input type="email" className="form-control" placeholder="Enter email" />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Student ID</label>
                    <input type="text" className="form-control" placeholder="Enter student ID" />
                  </div>
                </div>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Year/Grade Level</label>
                    <select className="form-select">
                      <option>Select year</option>
                      <option>Freshman</option>
                      <option>Sophomore</option>
                      <option>Junior</option>
                      <option>Senior</option>
                    </select>
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Major/Program</label>
                    <input type="text" className="form-control" placeholder="Enter major" />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </form>
            </div>
          </div>
        </div>
      </div>
      
      <div className="row">
        <div className="col-lg-6 mb-4">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">Goals</h5>
            </div>
            <div className="card-body">
              <p className="text-muted">No goals set yet.</p>
              <button className="btn btn-outline-primary">Add Goal</button>
            </div>
          </div>
        </div>
        
        <div className="col-lg-6 mb-4">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">Skills</h5>
            </div>
            <div className="card-body">
              <p className="text-muted">No skills added yet.</p>
              <button className="btn btn-outline-primary">Add Skill</button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="row">
        <div className="col-12 mb-4">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">Resume Upload</h5>
            </div>
            <div className="card-body">
              <div className="file-upload-area">
                <p className="mb-2">📄</p>
                <p>Drag and drop your resume here, or click to browse</p>
                <p className="text-muted small">Supported formats: PDF, DOCX (Max 10MB)</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;
