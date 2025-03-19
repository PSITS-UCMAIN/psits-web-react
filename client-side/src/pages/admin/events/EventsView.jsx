import React, { useEffect, useState } from "react";
import { CSVLink } from "react-csv";
import { InfinitySpin } from "react-loader-spinner";
import { Tab, TabList, TabPanel, Tabs } from "react-tabs";
import "react-tabs/style/react-tabs.css";
import ButtonsComponent from "../../../components/Custom/ButtonsComponent";
import TableComponent from "../../../components/Custom/TableComponent";



const Events = (props) => {
	const [data, setData] = useState([]); // Testing
	const [loading, setLoading] = useState(true); // Testing
	const [scanQRCode, handleScanQRCode] = useState();
	const [activeTab, setActiveTab] = useState(0);
	const [filteredData, setFilteredData] = useState([]);
	const [searchQuery, setSearchQuery] = useState("");
	const columns = [
		{
			key: "student",
			label: "Student Name",
			sortable: true,
			cell: (row) => row.student, // Display the student name from the row
		},
		{
			key: "id",
			label: "ID Number",
			sortable: true,
			cell: (row) => row.id, // Display the student ID number from the row
		},
		{
			key: "course",
			label: "Course",
			sortable: true,
			cell: (row) => row.course, // Display the course from the row
		},
		{
			key: "year",
			label: "Year",
			sortable: true,
			cell: (row) => row.year, // Display the year from the row
		},
		{
			key: "type",
			label: "Type",
			sortable: true,
			cell: (row) => row.type, // Display the type from the row (e.g., Full-time/Part-time)
		},
		{ 
			key: "status",
			label: "Status",
			sortable: true,
			cell: (row) => (
			<div className="text-center">
				<span
				className={`px-2 py-1 rounded text-xs ${
					row.status === "Confirmed" 
						? "bg-green-200 text-green-800"
					: row.status === "Pending"
					? "bg-yellow-200 text-yellow-800" 
					: row.status === "Absent"
					? "bg-red-200 text-red-800" 
					: "bg-gray-200 text-gray-800" 
					
				}`}
				>
				{row.status}
				</span>
			</div>
			),
		},
		{
			key: "time",
			label: "Confirmed Time",
			sortable: true,
			cell: (row) => new Date(row.time).toLocaleString(), // Format the confirmed time
		},
		{
			key: "scan",
			label: "Scan QR Code",
			cell: (row) => (
			<button
				onClick={() => handleScanQRCode(row.id)}
				className="bg-blue-100 text-blue-800 hover:bg-blue-200 active:bg-blue-300 rounded-md p-2 text-sm transition duration-150 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400 flex items-center gap-2"
			>
				<i className="fas fa-qrcode text-base"></i>
				Scan QR
			</button>
			),
		},
		];


  // Dummy data gpt
	const dummyData = async () => {
		// Simulating an async operation (like fetching data)
		return new Promise((resolve) => {
			setTimeout(() => {
				resolve([
					{
						student: "Jacinth Gwapo",
						id: "202310001",
						course: "Computer Science",
						year: "3rd Year",
						type: "Student",
						status: "Absent",
						time: "2025-01-16T09:00:00Z",
					},
					{
						student: "John Doe",
						id: "202310002",
						course: "Computer Science",
						year: "3rd Year",
						type: "Full-time",
						status: "Absent",
						time: "2025-01-16T09:00:00Z",
					},
					{
						student: "Jane Smith",
						id: "202310003",
						course: "Information Technology",
						year: "2nd Year",
						type: "Part-time",
						status: "Pending",
						time: "2025-01-15T14:30:00Z",
					},
					{
						student: "Alice Johnson",
						id: "202310004",
						course: "Engineering",
						year: "1st Year",
						type: "Full-time",
						status: "Pending",
						time: "2025-01-14T11:15:00Z",
					},
					{
						student: "Bob Brown",
						id: "202310005",
						course: "Business Administration",
						year: "4th Year",
						type: "Full-time",
						status: "Confirmed",
						time: "2025-01-16T13:45:00Z",
					},
					{
						student: "Eve White",
						id: "202310006",
						course: "Education",
						year: "2nd Year",
						type: "Part-time",
						status: "Pending",
						time: "2025-01-13T10:00:00Z",
					},
					{
						student: "Michael Lee",
						id: "202310007",
						course: "Mathematics",
						year: "3rd Year",
						type: "Full-time",
						status: "Confirmed",
						time: "2025-01-17T12:00:00Z",
					},
					{
						student: "Sarah Brown",
						id: "202310008",
						course: "Physics",
						year: "2nd Year",
						type: "Part-time",
						status: "Pending",
						time: "2025-01-14T09:00:00Z",
					},
					{
						student: "Chris Evans",
						id: "202310009",
						course: "Biology",
						year: "4th Year",
						type: "Full-time",
						status: "Absent",
						time: "2025-01-16T15:30:00Z",
					},
					{
						student: "Nina Patel",
						id: "202310010",
						course: "Chemistry",
						year: "1st Year",
						type: "Full-time",
						status: "Confirmed",
						time: "2025-01-15T08:00:00Z",
					},
					{
						student: "George Martin",
						id: "202310011",
						course: "Economics",
						year: "2nd Year",
						type: "Part-time",
						status: "Pending",
						time: "2025-01-13T11:45:00Z",
					},
					{
						student: "Emma Watson",
						id: "202310012",
						course: "Literature",
						year: "3rd Year",
						type: "Full-time",
						status: "Confirmed",
						time: "2025-01-16T10:30:00Z",
					},
					{
						student: "Tom Hardy",
						id: "202310013",
						course: "Philosophy",
						year: "1st Year",
						type: "Full-time",
						status: "Absent",
						time: "2025-01-14T14:00:00Z",
					},
					{
						student: "Kate Middleton",
						id: "202310014",
						course: "Art History",
						year: "2nd Year",
						type: "Part-time",
						status: "Pending",
						time: "2025-01-12T13:00:00Z",
					},
					{
						student: "Will Smith",
						id: "202310015",
						course: "Law",
						year: "4th Year",
						type: "Full-time",
						status: "Confirmed",
						time: "2025-01-16T07:45:00Z",
					},
					{
						student: "Olivia Pope",
						id: "202310016",
						course: "Political Science",
						year: "3rd Year",
						type: "Full-time",
						status: "Absent",
						time: "2025-01-14T16:30:00Z",
					},
					{
						student: "Harry Styles",
						id: "202310017",
						course: "Music",
						year: "2nd Year",
						type: "Part-time",
						status: "Pending",
						time: "2025-01-13T12:00:00Z",
					},
					{
						student: "Zara Ali",
						id: "202310018",
						course: "Social Work",
						year: "1st Year",
						type: "Full-time",
						status: "Confirmed",
						time: "2025-01-16T09:00:00Z",
					},
					{
						student: "Liam Neeson",
						id: "202310019",
						course: "History",
						year: "3rd Year",
						type: "Full-time",
						status: "Absent",
						time: "2025-01-15T08:30:00Z",
					},
					{
						student: "Scarlett Johansson",
						id: "202310020",
						course: "Psychology",
						year: "2nd Year",
						type: "Part-time", 
						status: "Confirmed",
						time: "2025-01-16T13:00:00Z",
					}
				]);
			}, 1000); // Simulating 1 second delay
		});
	};
	
  
const fetchData = async () => {
	try {
	setLoading(true);
	const result = await dummyData();
	setData(result);
	setFilteredData(result);
	setLoading(false);
	} catch (error) {
	console.error("Error fetching data: ", error);
	setLoading(false);
	}
	};
 
	useEffect(() => {
	  fetchData();
	}, []);}