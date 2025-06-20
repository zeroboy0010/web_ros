import ROSLIB from 'roslib';
import { useState, useEffect, useCallback } from 'react';

// Default ROS connection configuration
const DEFAULT_WS_URL = (() => {
    // Use the current hostname if in browser environment
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        return `ws://${hostname}:9090`;
    }
    // Fallback for non-browser environments
    return 'ws://localhost:9090';
})();
const DEFAULT_TOPIC = '/chatter';

export const useRosConnection = (initialWsUrl = DEFAULT_WS_URL) => {
  const [connected, setConnected] = useState(false);
  const [ros, setRos] = useState(null);
  const [ipAddress, setIpAddress] = useState('Unknown');
  const [wsUrl, setWsUrl] = useState(initialWsUrl);

  // Initialize ROS connection
  useEffect(() => {
    const newRos = new ROSLIB.Ros({
      url: wsUrl
    });

    newRos.on('connection', () => {
      console.log('Connected to websocket server.');
      setConnected(true);
      
      const ipMatch = wsUrl.match(/ws:\/\/([^:]+)/);
      if (ipMatch && ipMatch[1]) {
        setIpAddress(ipMatch[1]);
      }
    });

    newRos.on('error', (error) => {
      console.log('Error connecting to websocket server:', error);
      setConnected(false);
    });

    newRos.on('close', () => {
      console.log('Connection to websocket server closed.');
      setConnected(false);
      setTimeout(() => {
        newRos.connect(wsUrl);
      }, 3000);
    });

    setRos(newRos);

    return () => {
      if (newRos) {
        newRos.close();
      }
    };
  }, [wsUrl]);

  return {
    ros,
    connected,
    ipAddress,
    wsUrl,
    setWsUrl
  };
};

export const useTopicSubscription = (ros, connected, topicName = DEFAULT_TOPIC) => {
  const [messages, setMessages] = useState([]);
  const [messageData, setMessageData] = useState([]);

  useEffect(() => {
    if (!ros || !connected || !topicName) return;

    const listener = new ROSLIB.Topic({
      ros: ros,
      name: topicName,
      messageType: 'std_msgs/String'
    });

    listener.subscribe((message) => {
      const newMessage = {
        data: message.data,
        timestamp: new Date().toLocaleTimeString()
      };
      
      setMessages(prev => [...prev.slice(-9), newMessage]);
      setMessageData(prev => {
        const newData = [...prev, { x: new Date().toLocaleTimeString(), y: message.data.length }];
        return newData.slice(-10);
      });
    });

    return () => {
      listener.unsubscribe();
    };
  }, [ros, connected, topicName]);

  return { messages, messageData };
};

export const useWeightSubscription = (ros, connected) => {
  const [robotWeight, setRobotWeight] = useState(0);

  useEffect(() => {
    if (!ros || !connected) return;

    const weightListener = new ROSLIB.Topic({
      ros: ros,
      name: '/weight',
      messageType: 'std_msgs/Float32'
    });

    weightListener.subscribe((message) => {
      setRobotWeight(message.data);
    });

    return () => {
      weightListener.unsubscribe();
    };
  }, [ros, connected]);

  return robotWeight;
};

export const publishMessage = (ros, connected, topic = DEFAULT_TOPIC) => {
  if (!ros || !connected) return;

  const publisher = new ROSLIB.Topic({
    ros: ros,
    name: topic,
    messageType: 'std_msgs/String'
  });

  const message = new ROSLIB.Message({
    data: `Hello from React at ${new Date().toLocaleTimeString()}`
  });

  publisher.publish(message);
};

export const sendGoalPosition = (ros, connected, position) => {
  if (!ros || !connected) return;

  const publisher = new ROSLIB.Topic({
    ros: ros,
    name: '/web_goal',
    messageType: 'std_msgs/String'
  });

  const message = new ROSLIB.Message({
    data: position
  });

  publisher.publish(message);
  console.log(`Sent goal position: ${position}`);
};

export const useAmclPoseSubscription = (ros, connected) => {
  const [robotPosition, setRobotPosition] = useState({ x: 0, y: 0, theta: 0 });

  useEffect(() => {
    if (!ros || !connected) return;

    const poseListener = new ROSLIB.Topic({
      ros: ros,
      name: '/amcl_pose',
      messageType: 'geometry_msgs/PoseWithCovarianceStamped'
    });

    poseListener.subscribe((message) => {
      const pose = message.pose.pose;
      const position = pose.position;
      
      // Extract orientation (theta) from quaternion
      const quaternion = pose.orientation;
      const theta = Math.atan2(
        2.0 * (quaternion.w * quaternion.z + quaternion.x * quaternion.y),
        1.0 - 2.0 * (quaternion.y * quaternion.y + quaternion.z * quaternion.z)
      );
      
      setRobotPosition({
        x: position.x.toFixed(2),
        y: position.y.toFixed(2),
        theta: (theta * 180 / Math.PI).toFixed(1)
      });
    });

    return () => {
      poseListener.unsubscribe();
    };
  }, [ros, connected]);

  return robotPosition;
};

export const useNav2StatusSubscription = (ros, connected) => {
  const [navStatus, setNavStatus] = useState('Idle');

  useEffect(() => {
    if (!ros || !connected) return;

    const statusListener = new ROSLIB.Topic({
      ros: ros,
      name: '/nav2_status',
      messageType: 'std_msgs/String'
    });

    statusListener.subscribe((message) => {
      setNavStatus(message.data);
    });

    return () => {
      statusListener.unsubscribe();
    };
  }, [ros, connected]);

  return navStatus;
};

export const cancelNavigation = (ros, connected) => {
  if (!ros || !connected) return;

  const publisher = new ROSLIB.Topic({
    ros: ros,
    name: '/nav2_cancel',
    messageType: 'std_msgs/Empty'
  });

  const message = new ROSLIB.Message({});
  publisher.publish(message);
  console.log('Navigation cancelled');
};

// New function to publish velocity commands
export const publishCmdVel = (ros, connected, linearX, angularZ) => {
  if (!ros || !connected) return;

  const cmdVelTopic = new ROSLIB.Topic({
    ros: ros,
    name: '/cmd_vel',
    messageType: 'geometry_msgs/Twist'
  });

  const twist = new ROSLIB.Message({
    linear: {
      x: linearX,
      y: 0.0,
      z: 0.0
    },
    angular: {
      x: 0.0,
      y: 0.0,
      z: angularZ
    }
  });

  cmdVelTopic.publish(twist);
};