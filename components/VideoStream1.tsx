"use client";

import React, { useRef, useEffect, useState } from "react";
import Webcam from "react-webcam";
import { io } from "socket.io-client";

// Ensure this URL matches your Flask-SocketIO server
const socket = io("ws://localhost:5000", {
    transports: ['websocket'],  // Force WebSocket transport if necessary
});

const VideoStream = () => {
    const webcamRef = useRef<Webcam>(null);
    interface Keypoint {
        label: string;
        x: number;
        y: number;
        score: number;
    }

    const [keypoints, setKeypoints] = useState<Keypoint[]>([]);

    // Emit frame data via WebSocket
    const sendFrame = (frame: string): void => {
        socket.emit("send_frame", frame); // Send frame over WebSocket
    };

    // Handle incoming keypoints from server
    useEffect(() => {
        socket.on("pose_result", (data: { keypoints: Keypoint[] }) => {
            setKeypoints(data.keypoints);
        });

        socket.on("error", (error: { error: string }) => {
            console.error("Error from server:", error.error);
        });

        return () => {
            socket.off("pose_result");
            socket.off("error");
        };
    }, []);

    const captureFrames = () => {
        if (webcamRef.current) {
            const imageSrc = webcamRef.current.getScreenshot();
            if (imageSrc) {
                sendFrame(imageSrc); // Send frame to server
            }
        }
    };

    useEffect(() => {
        const interval = setInterval(captureFrames, 100); // Capture every 100ms
        return () => clearInterval(interval);
    }, []);

    return (
        <div>
            <Webcam
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                style={{ width: "640px", height: "480px" }}
            />
            <div>
                <h2>Detected Keypoints:</h2>
                <ul>
                    {keypoints.map((kp, index) => (
                        <li key={index}>
                            {kp.label}: (x: {kp.x}, y: {kp.y}, score: {kp.score})
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default VideoStream;
