import { useState } from 'react';
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
import { 
  useRosConnection, 
  useTopicSubscription, 
  useWeightSubscription,
  useAmclPoseSubscription,
  useNav2StatusSubscription,
  publishMessage as publishRosMessage,
  sendGoalPosition as sendRosGoalPosition,
  cancelNavigation
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
          <div className="page-content">
            <h2>Manual Page</h2>
            <p>User manual content will be displayed here.</p>
          </div>
        )}
        
        {activePage === 'about' && (
          <div className="page-content">
            <h2>About Us</h2>
            <p>Information about the Trailobot project and team.</p>
          </div>
        )}
      </header>
    </div>
  );
}

export default App;