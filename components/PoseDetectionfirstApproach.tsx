"use client"

import React, { useRef, useEffect, useState } from 'react';
import Webcam from "react-webcam";

const VideoStream = () => {
    const webcamRef = useRef<Webcam>(null);
    interface Keypoint {
        label: string;
        x: number;
        y: number;
        score: number;
    }

    const [keypoints, setKeypoints] = useState<Keypoint[]>([]);

    interface FrameResponse {
        keypoints: Keypoint[];
    }

    const sendFrame = async (frame: string): Promise<void> => {
        try {
            const response = await fetch("http://localhost:5000/detect_pose", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ frame }),
            });

            const data: FrameResponse = await response.json();
            if (data.keypoints) {
                setKeypoints(data.keypoints);
            }
        } catch (error) {
            console.error("Error sending frame:", error);
        }
    };

    const captureFrames = () => {
        if (webcamRef.current) {
            const imageSrc = webcamRef.current.getScreenshot();
            if (imageSrc) {
                sendFrame(imageSrc);
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
