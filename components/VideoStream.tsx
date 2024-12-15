"use client"
import React, { useRef, useEffect, useState, useCallback } from "react";
import Webcam from "react-webcam";
import { io, Socket } from "socket.io-client";
import { throttle } from "lodash";

// Define types
interface Keypoint {
    id: number;
    x: number;
    y: number;
    z: number;
    hand_width: number;
    hand_height: number;
}

interface KeyboardKey {
    key: string;
    x: number;
    y: number;
    width: number;
    height: number;
}

const KEYBOARD_LAYOUT = [
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L", ";"],
    ["Z", "X", "C", "V", "B", "N", "M", ",", ".", "/"],
    ["BS", "SPACE"]
];

const COOLDOWN_TIME = 1000;
const PINCH_THRESHOLD = 10;
const FRAME_INTERVAL = 100; // Reduced frame rate

const VideoStream = () => {
    const webcamRef = useRef<Webcam>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const socketRef = useRef<Socket>();
    const [pressedKey, setPressedKey] = useState<string | null>(null);
    const [outputText, setOutputText] = useState("");
    const lastKeyPressed = useRef<string | null>(null);
    const [isCooldownActive, setCooldownActive] = useState(false);
    // const [pinchDistance, setPinchDistance] = useState(Infinity);
    const [keypoints, setKeypoints] = useState<Keypoint[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Initialize socket connection
        // socketRef.current = io("http://virtualkeyboard.yuwawork.in:5000/", {
        //     transports: ["websocket"],
        // });
        // Initialize socket connection
        // socketRef.current = io("ws://localhost:5000", {
        //     transports: ["websocket"],
        // });
        // Initialize socket connection
        socketRef.current = io("https://virtualkeyboard.yuwawork.in/", {
            transports: ["websocket"],
        });
        // socketRef.current = io("https://virtualkeyboard-bidv.onrender.com/", {
        //     transports: ["websocket"],
        // });

        socketRef.current.on("connect", () => {
            setIsLoading(false);
        });

        socketRef.current.on("connect_error", (err) => {
            setError("Failed to connect to server");
            console.error("Socket connection error:", err);
        });

        socketRef.current.on("hand_keypoints", (data: { keypoints: Keypoint[] }) => {
            // console.log("Received keypoints:", data.keypoints);
            setKeypoints(data.keypoints);
        });

        return () => {
            socketRef.current?.disconnect();
        };
    }, []);

    const sendFrame = useCallback((frame: string): void => {
        if (socketRef.current?.connected) {
            socketRef.current.emit("send_frame", frame);
        }
    }, []);

    const calculateDistance = (point1: Keypoint | undefined, point2: Keypoint | undefined): number => {
        if (!point1 || !point2) return Infinity;
        let distance = Math.sqrt(
            Math.pow(point1.x - point2.x, 2) +
            Math.pow(point1.y - point2.y, 2)
        );

        const result = (distance / Math.sqrt(Math.pow(point1.hand_width, 2) + Math.pow(point1.hand_height, 2))) * 100;


        return result;
    };

    const detectKeyPress = useCallback((): string | null => {
        if (keypoints.length === 0) return null;

        const indexTip = keypoints[8];

        let closestKey: { key: string; distance: number } | null = { key: "", distance: Infinity };

        KEYBOARD_LAYOUT.forEach((row, rowIndex) => {
            row.forEach((key, colIndex) => {
                const x = 50 + colIndex * 60;
                const y = 50 + rowIndex * 60;
                const keyCenter = {
                    x: x + 25,
                    y: y + 25
                };

                const distance = Math.sqrt(
                    Math.pow(indexTip.x - keyCenter.x, 2) +
                    Math.pow(indexTip.y - keyCenter.y, 2)
                );

                if (!closestKey || distance < closestKey.distance) {
                    closestKey = { key, distance };
                }
            });
        });

        return closestKey && closestKey.distance < 30 ? closestKey.key : null;
    }, [keypoints]);

    const handleKeyPress = useCallback((key: string) => {
        if (isCooldownActive || lastKeyPressed.current === key) return;
        // console.log("Key Pressed: ", key);

        setPressedKey(key);

        switch (key) {
            case "SPACE":
                setOutputText(prev => prev + " ");
                break;
            case "BS":
                setOutputText(prev => prev.slice(0, -1));
                break;
            default:
                setOutputText(prev => prev + key);
        }

        lastKeyPressed.current = key;
        setCooldownActive(true);
        setTimeout(() => {
            setCooldownActive(false);
            lastKeyPressed.current = null;
            setPressedKey(null);
        }, COOLDOWN_TIME);
    }, [isCooldownActive]);

    const drawKeyboard = useCallback((ctx: CanvasRenderingContext2D) => {
        KEYBOARD_LAYOUT.forEach((row, rowIndex) => {
            row.forEach((key, colIndex) => {
                const x = 50 + colIndex * 60;
                const y = 50 + rowIndex * 60;
                const width = 50;
                const height = 50;
                // if (rowIndex == 4 && colIndex == 1) {
                //     console.log("Spacebar");
                //     ctx.fillStyle = key === pressedKey ? "#4caf50" : "#333";
                //     ctx.fillRect(x, y, width + 40, height + 20);
                // } else {
                ctx.fillStyle = key === pressedKey ? "#4caf50" : "#333";
                ctx.fillRect(x, y, width, height);
                // console.log(key)
                // }


                if (key === pressedKey) {
                    ctx.strokeStyle = "#ffffff";
                    ctx.lineWidth = 2;
                    ctx.strokeRect(x, y, width, height);
                }

                ctx.fillStyle = "#fff";
                ctx.font = "20px Arial";
                ctx.fillText(key, x + 10, y + 30);
            });
        });
    }, [pressedKey]);

    const drawOutputText = useCallback((ctx: CanvasRenderingContext2D) => {
        if (outputText) {
            const text = "Output Text: " + outputText;
            const fontSize = 24;

            // Set font style
            ctx.font = `${fontSize}px Arial`;

            // Measure the text width and height
            const textWidth = ctx.measureText(text).width;
            const textHeight = fontSize; // approximate height for a 24px font

            // Set the position for the text (you can adjust this as needed)
            const x = 20;
            const y = canvasRef.current!.height - 30;

            // Draw a black background rectangle (boundary box)
            ctx.fillStyle = "black";
            ctx.fillRect(x - 10, y - textHeight, textWidth + 20, textHeight + 10); // padding around the text

            // Draw the text in white
            ctx.fillStyle = "white";
            ctx.fillText(text, x, y);
        }
    }, [outputText]);

    const drawKeypoints = useCallback(() => {
        const canvas = canvasRef.current;
        const context = canvas?.getContext("2d");

        if (canvas && context) {
            canvas.width = 640;
            canvas.height = 480;
            context.clearRect(0, 0, canvas.width, canvas.height);

            // Apply mirroring transformation
            context.save();
            context.scale(-1, 1);
            context.translate(-canvas.width, 0);

            const connections = [
                [0, 1], [1, 2], [2, 3], [3, 4],
                [0, 5], [5, 6], [6, 7], [7, 8],
                [0, 9], [9, 10], [10, 11], [11, 12],
                [0, 13], [13, 14], [14, 15], [15, 16],
                [0, 17], [17, 18], [18, 19], [19, 20],
            ];

            // Draw connections using mirrored coordinates
            connections.forEach(([startIdx, endIdx]) => {
                const kpStart = keypoints.find((kp) => kp.id === startIdx);
                const kpEnd = keypoints.find((kp) => kp.id === endIdx);

                if (kpStart && kpEnd) {
                    context.beginPath();
                    context.moveTo(canvas.width - kpStart.x, kpStart.y);
                    context.lineTo(canvas.width - kpEnd.x, kpEnd.y);
                    context.strokeStyle = "blue";
                    context.lineWidth = 2;
                    context.stroke();
                }
            });

            // Draw keypoints using mirrored coordinates
            keypoints.forEach((kp) => {
                context.beginPath();
                context.arc(canvas.width - kp.x, kp.y, 5, 0, 2 * Math.PI);
                context.fillStyle = "red";
                context.fill();
            });

            // Restore the transform before drawing keyboard
            context.restore();
            drawKeyboard(context);
            drawOutputText(context);
        }

        requestAnimationFrame(drawKeypoints);
    }, [keypoints, drawKeyboard]);

    useEffect(() => {
        const interval = setInterval(() => {
            if (webcamRef.current) {
                const imageSrc = webcamRef.current.getScreenshot();
                if (imageSrc) {
                    sendFrame(imageSrc);
                }
            }
        }, FRAME_INTERVAL);
        return () => clearInterval(interval);
    }, [sendFrame]);

    const throttledDetectKeyPress = useCallback(throttle(() => {
        const distance = calculateDistance(keypoints[8], keypoints[4]);

        if (distance < PINCH_THRESHOLD && !isCooldownActive) {
            const detectedKey = detectKeyPress();
            console.log("Detected Key:", detectedKey);
            if (detectedKey) {
                handleKeyPress(detectedKey);
            }
        }
    }, 100), [keypoints, isCooldownActive, handleKeyPress, detectKeyPress]);

    useEffect(() => {
        throttledDetectKeyPress();
    }, [keypoints, throttledDetectKeyPress]);

    useEffect(() => {
        const animationFrame = requestAnimationFrame(drawKeypoints);
        return () => cancelAnimationFrame(animationFrame);
    }, [drawKeypoints]);

    if (error) {
        return <div className="text-red-500">Error: {error}</div>;
    }

    if (isLoading) {
        return <div>Loading...</div>;
    }

    // console.log("Keypoints:", keypoints);

    return (
        <div className="relative w-[640px] h-[480px] mt-[400px]">
            <Webcam
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={{
                    width: 640,
                    height: 480,
                    facingMode: "user",
                }}
                className="absolute top-0 left-0 w-full h-full z-[1]"
                mirrored={true}
            />
            <canvas
                ref={canvasRef}
                className="absolute top-0 left-0 w-full h-full z-[2] pointer-events-none"
            />
            <div className="absolute bottom-32">
                <h1>Output Text: {outputText}</h1>
            </div>
        </div>
    );
};

export default VideoStream;