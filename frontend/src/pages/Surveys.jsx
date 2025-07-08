import React from 'react';

function Surveys() {
  return (
    <div className="container">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1>Surveys</h1>
            <button className="btn btn-primary">Create New Survey</button>
          </div>
        </div>
      </div>
      
      <div className="row">
        <div className="col-lg-8 mb-4">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">Available Surveys</h5>
            </div>
            <div className="card-body">
              <p className="text-muted">No surveys available at this time.</p>
              <p><em>Survey functionality will be implemented in the next phase.</em></p>
            </div>
          </div>
        </div>
        
        <div className="col-lg-4 mb-4">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">Survey Statistics</h5>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <div className="d-flex justify-content-between">
                  <span>Total Surveys:</span>
                  <strong>0</strong>
                </div>
              </div>
              <div className="mb-3">
                <div className="d-flex justify-content-between">
                  <span>Completed:</span>
                  <strong>0</strong>
                </div>
              </div>
              <div className="mb-3">
                <div className="d-flex justify-content-between">
                  <span>Pending:</span>
                  <strong>0</strong>
                </div>
              </div>
              <div className="progress">
                <div className="progress-bar" role="progressbar" style={{width: '0%'}}>
                  0%
                </div>
              </div>
              <small className="text-muted">Completion Rate</small>
            </div>
          </div>
        </div>
      </div>
      
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">Survey Templates</h5>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-4 mb-3">
                  <div className="card border-2 border-dashed">
                    <div className="card-body text-center">
                      <h6 className="card-title">Beginning of Term</h6>
                      <p className="card-text small text-muted">
                        Collect initial student information and goals
                      </p>
                      <button className="btn btn-outline-primary btn-sm" disabled>
                        Use Template
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="col-md-4 mb-3">
                  <div className="card border-2 border-dashed">
                    <div className="card-body text-center">
                      <h6 className="card-title">Mid-term Check-in</h6>
                      <p className="card-text small text-muted">
                        Progress assessment and goal adjustment
                      </p>
                      <button className="btn btn-outline-primary btn-sm" disabled>
                        Use Template
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="col-md-4 mb-3">
                  <div className="card border-2 border-dashed">
                    <div className="card-body text-center">
                      <h6 className="card-title">Project Preferences</h6>
                      <p className="card-text small text-muted">
                        Gather preferences for group projects
                      </p>
                      <button className="btn btn-outline-primary btn-sm" disabled>
                        Use Template
                      </button>
                    </div>
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

export default Surveys;
