import { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import './App.css';
import './AboutUs.css';
import { 
  useRosConnection, 
  useTopicSubscription, 
  useWeightSubscription,
  useAmclPoseSubscription,
  useNav2StatusSubscription,
  publishMessage as publishRosMessage,
  sendGoalPosition as sendRosGoalPosition,
  cancelNavigation,
  publishCmdVel
} from './ros';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

function App() {
  // Get ROS connection from our service
  const { ros, connected, ipAddress } = useRosConnection();
  
  // Get topic subscription data
  const { messageData } = useTopicSubscription(ros, connected, '/chatter');
  
  // Get weight data
  const robotWeight = useWeightSubscription(ros, connected);
  
  // Get AMCL pose data
  const robotPosition = useAmclPoseSubscription(ros, connected);
  
  // Get Nav2 status
  const navStatus = useNav2StatusSubscription(ros, connected);
  
  // UI state
  const [selectedButton, setSelectedButton] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [activePage, setActivePage] = useState('home');

  // Add new state variables for manual control
  const [controlMode, setControlMode] = useState('autonomous');
  const [linearVelocity, setLinearVelocity] = useState(0);
  const [angularVelocity, setAngularVelocity] = useState(0);
  const [publishInterval, setPublishInterval] = useState(null);

  // Function to publish a message
  const publishMessage = () => {
    publishRosMessage(ros, connected);
  };

  // Function to handle button click
  const handleButtonClick = (row, col) => {
    const position = `${row}${col}`;
    setSelectedButton(position);
    setShowConfirmation(true);
  };

  // Function to handle confirmation
  const handleConfirmation = (confirmed) => {
    if (confirmed && selectedButton) {
      sendRosGoalPosition(ros, connected, selectedButton);
    }
    setShowConfirmation(false);
    setSelectedButton(null);
  };

  // Function to handle emergency stop
  const handleEmergencyStop = () => {
    cancelNavigation(ros, connected);
  };

  // Function to handle navigation
  const handleNavigation = (page) => {
    setActivePage(page);
  };

  // Function to handle mode switch
  const handleModeChange = (event) => {
    const newMode = event.target.checked ? 'manual' : 'autonomous';
    setControlMode(newMode);
    
    // If switching to autonomous, stop publishing cmd_vel
    if (newMode === 'autonomous' && publishInterval) {
      clearInterval(publishInterval);
      setPublishInterval(null);
      // Send zero velocity to stop the robot
      publishCmdVel(ros, connected, 0, 0);
    } 
    // If switching to manual, start publishing cmd_vel
    else if (newMode === 'manual' && !publishInterval) {
      const interval = setInterval(() => {
        publishCmdVel(ros, connected, linearVelocity, angularVelocity);
      }, 100); // Publish at 10Hz
      setPublishInterval(interval);
    }
  };

  // Clean up interval on component unmount
  useEffect(() => {
    return () => {
      if (publishInterval) {
        clearInterval(publishInterval);
      }
    };
  }, [publishInterval]);

  // Update these handlers to include auto-reset
  const handleLinearVelocityChange = (event) => {
    setLinearVelocity(parseFloat(event.target.value));
  };

  const handleAngularVelocityChange = (event) => {
    setAngularVelocity(parseFloat(event.target.value));
  };

  // Add these new handlers for auto-reset
  const handleSliderRelease = () => {
    setLinearVelocity(0);
    setAngularVelocity(0);
  };

  // Chart data
  const chartData = {
    labels: messageData.map(item => item.x),
    datasets: [
      {
        label: 'Message Length',
        data: messageData.map(item => item.y),
        fill: false,
        backgroundColor: 'rgb(75, 192, 192)',
        borderColor: 'rgba(75, 192, 192, 0.2)',
      },
    ],
  };

  // Generate grid buttons
  const renderGrid = () => {
    const rows = ['A', 'B'];
    const cols = Array.from({ length: 50 }, (_, i) => i + 1);
    
    return (
      <div className="expanded-grid-container">
        <div className="side-label">
          <span>Front</span>
        </div>
        
        <div className="grid-container">
          {rows.map(row => (
            <div key={row} className="grid-row">
              {cols.map(col => {
                const spacing = (col === 10 || col === 30 || col === 40) ? 
                  'spacing-1' : 'spacing-0';
                
                return (
                  <button 
                    key={`${row}${col}`} 
                    className={`grid-button ${spacing}`}
                    onClick={() => handleButtonClick(row, col)}
                  >
                    {row}{col}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        
        <div className="side-label">
          <span>Back</span>
        </div>
      </div>
    );
  };

  // Render confirmation dialog
  const renderConfirmationDialog = () => {
    if (!showConfirmation) return null;

    return (
      <div className="confirmation-overlay">
        <div className="confirmation-dialog">
          <p>Send robot to position {selectedButton}?</p>
          <div className="confirmation-buttons">
            <button onClick={() => handleConfirmation(true)}>OK</button>
            <button onClick={() => handleConfirmation(false)}>Cancel</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="App">
      <header className="App-header">
        <div className="top-bar">
          <h1>Trailobot Dashboard</h1>
        </div>
        
        {/* Main Navigation Bar */}
        <div className="nav-bar">
          <div 
            className={`nav-item ${activePage === 'home' ? 'active' : ''}`}
            onClick={() => handleNavigation('home')}
          >
            Home
          </div>
          <div 
            className={`nav-item ${activePage === 'edit' ? 'active' : ''}`}
            onClick={() => handleNavigation('edit')}
          >
            Edit
          </div>
          <div 
            className={`nav-item ${activePage === 'manual' ? 'active' : ''}`}
            onClick={() => handleNavigation('manual')}
          >
            Manual
          </div>
          <div 
            className={`nav-item ${activePage === 'about' ? 'active' : ''}`}
            onClick={() => handleNavigation('about')}
          >
            About US
          </div>
        </div>
        

        
        {/* The rest of your content would only show on the home page */}
        {activePage === 'home' && (
          <>
            <div className="status-panels">
              <div className="connection-status-container">
                <h2>IP & ROS Connection</h2>
                <div className="connection-status">
                  IP: {ipAddress || 'Not available'}
                </div>
                <div className="connection-status">
                  Status: {connected ? 
                    <span style={{color: 'green'}}>Connected</span> : 
                    <span style={{color: 'red'}}>Disconnected</span>}
                </div>
              </div>
              
              <div className="weight-display">
                <h2>Weight Payload</h2>
                <div className="weight-value">{robotWeight.toFixed(1)} kg</div>
              </div>
              
              <div className="nav-status-container">
                <h2>Navigation Status</h2>
                <div className="nav-status">{navStatus}</div>
                <button 
                  className="emergency-button"
                  onClick={handleEmergencyStop}
                >
                  EMERGENCY STOP
                </button>
              </div>
              
              <div className="robot-position-container">
                <h2>ROBOT Position (amcl)</h2>
                <div className="position-data">
                  <div>X: {robotPosition.x} m</div>
                  <div>Y: {robotPosition.y} m</div>
                  <div>θ: {robotPosition.theta}°</div>
                </div>
              </div>
            </div>
            
            <div className="grid-section">
              <h2>Position Selection</h2>
              {renderGrid()}
            </div>
            
            {renderConfirmationDialog()}
          </>
        )}
        
        {/* Add placeholder content for other pages */}
        {activePage === 'edit' && (
          <div className="page-content">
            <h2>Edit Page</h2>
            <p>Edit functionality will be implemented here.</p>
          </div>
        )}
        
        {activePage === 'manual' && (
          <div className="page-content manual-control-page">
            <h2>Manual Control</h2>
            
            <div className="control-mode-switch">
              <span className={controlMode === 'autonomous' ? 'active-mode' : ''}>Autonomous</span>
              <label className="switch">
                <input 
                  type="checkbox" 
                  checked={controlMode === 'manual'}
                  onChange={handleModeChange}
                />
                <span className="slider round"></span>
              </label>
              <span className={controlMode === 'manual' ? 'active-mode' : ''}>Manual</span>
            </div>
            
            {controlMode === 'manual' && (
              <div className="velocity-controls">
                {/* Vertical Linear Velocity Slider (Left) */}
                <div className="velocity-slider vertical">
                  <label>Linear Velocity (m/s): {linearVelocity.toFixed(2)}</label>
                  <div className="vertical-slider-container">
                    <div className="vertical-slider-labels">
                      <span>0.5</span>
                      <span>0</span>
                      <span>-0.5</span>
                    </div>
                    <input 
                      type="range" 
                      min="-0.5" 
                      max="0.5" 
                      step="0.01" 
                      value={linearVelocity}
                      onChange={handleLinearVelocityChange}
                      onMouseUp={handleSliderRelease}
                      onTouchEnd={handleSliderRelease}
                    />
                  </div>
                </div>
                
                {/* Horizontal Angular Velocity Slider (Right) */}
                <div className="velocity-slider horizontal">
                  <label>Angular Velocity (rad/s): {angularVelocity.toFixed(2)}</label>
                  <input 
                    type="range" 
                    min="-1.0" 
                    max="1.0" 
                    step="0.01" 
                    value={angularVelocity}
                    onChange={handleAngularVelocityChange}
                    onMouseUp={handleSliderRelease}
                    onTouchEnd={handleSliderRelease}
                    className="horizontal-slider"
                  />
                  <div className="horizontal-slider-labels">
                    <span>-1.0</span>
                    <span>0</span>
                    <span>1.0</span>
                  </div>
                </div>
                
                <div className="connection-status warning">
                  <strong>Warning:</strong> Manual control active. Be careful when operating the robot.
                </div>
              </div>
            )}
          </div>
        )}
        
        {activePage === 'about' && (
          <div className="about-us-container">
            <div className="about-us-content">
              <div className="about-us-main">
                <div className="about-us-title">About Trailobot V2</div>
                <div className="about-us-paragraph">
                  Trailobot V2 is a smart, heavy-duty autonomous mobile robot (AMR) designed to transport loads of up to 300 kg in indoor environments such as warehouses, factories, and farms. It features autonomous navigation, obstacle avoidance, and real-time mapping, allowing it to move safely and efficiently without human intervention. With a user-friendly interface and optional wireless calling system, Trailobot V2 simplifies material handling and improves workflow automation for a variety of industrial and commercial applications.
                </div>
                <div className="about-us-info">
                  <div><strong>Contact Email:</strong> trailobot-support@example.com</div>
                  <div><strong>Contact Phone Number:</strong> 012 345 678</div>
                  <div><strong>Lab Name:</strong> AutobotX</div>
                  <div><strong>Company Name:</strong> AI Farm Robotics</div>
                </div>
              </div>
              <div className="about-us-image">
                <img 
                  src="https://media.licdn.com/dms/image/v2/D5622AQF9yvZq_U6T4A/feedshare-shrink_2048_1536/B56ZXP6XmvHEAo-/0/1742949942252?e=1753315200&v=beta&t=6NIF1GG88DVpd2kt3JPuSlI1_bma3f-Ye9O164nm4jQ" 
                  alt="Trailobot V2" 
                />
              </div>
            </div>
          </div>
        )}
      </header>
    </div>
  );
}

export default App;