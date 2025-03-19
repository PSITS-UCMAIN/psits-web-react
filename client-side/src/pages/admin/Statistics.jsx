import { React, useEffect, useState } from "react";
import { Bar, Doughnut, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Link } from "react-router-dom";
import { getStatistic } from "../../api/event";
import { useParams } from "react-router-dom";

//

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
);

const Statistics = () => {
  const { eventId } = useParams();
  const [datas, setData] = useState([]);

  const chartColors = {
		backgroundColor: [
			"rgba(0, 35, 102, 0.5)", // UC-Main - Royal Blue
			"rgba(128, 0, 128, 0.5)", // UC-LM - Purple
			"rgba(0, 128, 0, 0.5)", // UC-Banilad - Green
			"rgba(255, 215, 0, 0.5)", // UC-PT - Golden Yellow
			"rgba(255, 165, 0, 0.5)", // Orange
		],
		borderColor: [
			"rgba(0, 35, 102, 1)", // UC-Main - Royal Blue
			"rgba(128, 0, 128, 1)", // UC-LM - Purple
			"rgba(0, 128, 0, 1)", // UC-Banilad - Green
			"rgba(255, 215, 0, 1)", // UC-PT - Golden Yellow
			"rgba(255, 165, 0, 0.5)",
		],
	};
	const handleFetchData = async () => {
		const response = await getStatistic(eventId);

		setData(response);
	};
	useEffect(() => {
		handleFetchData();
	}, []);
	const studentYearsData = {
		labels: ["1st Years", "2nd Years", "3rd Years", "4th Years"],
		datasets: [
			{
				data: [
					datas.yearLevels?.First || 0,
					datas.yearLevels?.Second || 0,
					datas.yearLevels?.Third || 0,
					datas.yearLevels?.Fourth || 0,
				],
				backgroundColor: [
					"rgba(137, 121, 255, 1)",
					"rgba(255, 146, 138, 1)",
					"rgba(60, 195, 223, 1)",
					"rgba(255, 174, 76, 1)",
				],
				borderColor: [
					"rgb(255, 255, 255)",
					"rgb(255, 255, 255)",
					"rgb(255, 255, 255)",
					"rgb(255, 255, 255)",
				],
				borderWidth: 1,
			},
		],
	};
	const campusData = {
		labels: ["UC-Main", "UC-Banilad", "UC-LM", "UC-PT", "UC-CS"],
		datasets: [
			{
				label: "Number of Students",
				data: [
					datas.campuses?.Main || 0,
					datas.campuses?.Banilad || 0,
					datas.campuses?.LM || 0,
					datas.campuses?.PT || 0,
					datas.campuses?.CS || 0,
				],
				backgroundColor: [
					chartColors.backgroundColor[0],
					chartColors.backgroundColor[2],
					chartColors.backgroundColor[1],
					chartColors.backgroundColor[3],
					chartColors.backgroundColor[4],
				],
				borderColor: [
					chartColors.borderColor[0],
					chartColors.borderColor[2],
					chartColors.borderColor[1],
					chartColors.borderColor[3],
					chartColors.borderColor[4],
				],
				borderWidth: 1,
			},
		],
	};

	const courseData = {
		labels: ["IT Students", "CS Students"],
		datasets: [
			{
				data: [datas.courses?.BSIT || 0, datas.courses?.BSCS || 0],
				backgroundColor: ["rgba(137, 121, 255, 1)", "rgba(255, 146, 138, 1)"],
				borderColor: ["rgb(255, 255, 255)", "rgb(255, 255, 255)"],
				borderWidth: 1,
			},
		],
	};

	const chartOption1 = {
		responsive: true,
		maintainAspectRatio: true,
		plugins: {
			legend: {
				position: "top",
			},
		},
	};
	const chartOption2 = {
		maintainAspectRatio: false,
		responsive: true,

		plugins: {
			legend: {
				position: "bottom",
			},
		},
	};
	const campusAYearsData = {
		labels: ["First Year", "Second Year", "Third Year", "Fourth Year"],
		datasets: [
			{
				label: datas?.yearLevelsByCampus?.[0]?.campus,
				data: [
					datas?.yearLevelsByCampus?.[0]?.yearLevels?.First || 0,

					datas?.yearLevelsByCampus?.[0]?.yearLevels?.Second || 0,
					datas?.yearLevelsByCampus?.[0]?.yearLevels?.Third || 0,
					datas?.yearLevelsByCampus?.[0]?.yearLevels?.Fourth || 0,
				],
				backgroundColor: ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0"],
			},
		],
	};

	const campusBYearsData = {
		labels: ["First Year", "Second Year", "Third Year", "Fourth Year"],
		datasets: [
			{
				label: datas?.yearLevelsByCampus?.[1]?.campus,
				data: [
					datas?.yearLevelsByCampus?.[1]?.yearLevels?.First || 0,

					datas?.yearLevelsByCampus?.[1]?.yearLevels?.Second || 0,

					datas?.yearLevelsByCampus?.[1]?.yearLevels?.Third || 0,

					datas?.yearLevelsByCampus?.[1]?.yearLevels?.Fourth || 0,
				],
				backgroundColor: ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0"],
			},
		],
	};

	const campusCYearsData = {
		labels: ["First Year", "Second Year", "Third Year", "Fourth Year"],
		datasets: [
			{
				label: datas?.yearLevelsByCampus?.[2]?.campus,
				data: [
					datas?.yearLevelsByCampus?.[2]?.yearLevels?.First || 0,
					datas?.yearLevelsByCampus?.[2]?.yearLevels?.Second || 0,
					datas?.yearLevelsByCampus?.[2]?.yearLevels?.Third || 0,
					datas?.yearLevelsByCampus?.[2]?.yearLevels?.Fourth || 0,
				],
				backgroundColor: ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0"],
			},
		],
	};

	const campusDYearsData = {
		labels: ["First Year", "Second Year", "Third Year", "Fourth Year"],
		datasets: [
			{
				label: datas?.yearLevelsByCampus?.[3]?.campus,
				data: [
					datas?.yearLevelsByCampus?.[3]?.yearLevels?.First || 0,
					datas?.yearLevelsByCampus?.[3]?.yearLevels?.Second || 0,
					datas?.yearLevelsByCampus?.[3]?.yearLevels?.Third || 0,
					datas?.yearLevelsByCampus?.[3]?.yearLevels?.Fourth || 0,
				],
				backgroundColor: ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0"],
			},
		],
	};
	const campusEYearsData = {
		labels: ["First Year", "Second Year", "Third Year", "Fourth Year"],
		datasets: [
			{
				label: datas?.yearLevelsByCampus?.[4]?.campus,
				data: [
					datas?.yearLevelsByCampus?.[4]?.yearLevels?.First || 0,
					datas?.yearLevelsByCampus?.[4]?.yearLevels?.Second || 0,
					datas?.yearLevelsByCampus?.[4]?.yearLevels?.Third || 0,
					datas?.yearLevelsByCampus?.[4]?.yearLevels?.Fourth || 0,
				],
				backgroundColor: ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0"],
			},
		],
	};

	const attendedStudentYearsData = {
		labels: ["First Year", "Second Year", "Third Year", "Fourth Year"],
		datasets: [
			{
				label: "Attended Students",
				data: [
					datas?.yearLevelsAttended?.First,
					datas?.yearLevelsAttended?.Second,
					datas?.yearLevelsAttended?.Third,
					datas?.yearLevelsAttended?.Fourth,
				],
				backgroundColor: ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0"],
			},
		],
	};

	const attendedCampusData = {
		labels: ["UC-Main", "UC-Banilad", "UC-LM", "UC-PT", "UC-CS"],
		datasets: [
			{
				label: "Total Attended Students [Campus] ",
				data: [
					datas?.campusesAttended?.Main,
					datas?.campusesAttended?.Banilad,
					datas?.campusesAttended?.LM,
					datas?.campusesAttended?.PT,
					datas?.campusesAttended?.CS,
				],
				backgroundColor: [
					chartColors.backgroundColor[0],

					chartColors.backgroundColor[2],
					chartColors.backgroundColor[1],
					chartColors.backgroundColor[3],
					chartColors.backgroundColor[4],
				],
			},
		],
	};

	return (
		<div className="">
			{/* <Link to="/admin/events">
        <button className="lg:mt-5 sm:mt-3 ml-1 mb-2 text-[#002E48] hover:text-[#4398AC] transition duration-200 rounded-lg">
          <i className="fas fa-arrow-left lg:text-xl"></i>
        </button>
      </Link> */}
			<h1 className="h-auto text-3xl font-bold mb-2 text-center">
				Students Registered
			</h1>

			{/* DISTRIBUTION */}
			<div className="mt-5 mb-5 flex flex-col lg:flex-row gap-8 items-center justify-between">
				{/* Student Year Distribution */}
				<div className="w-full lg:w-1/2 min-h-[25vh] bg-[#F5F5F5] p-4 shadow-md rounded-lg">
					<Doughnut data={studentYearsData} options={chartOption2} />
				</div>

				{/* Course Distribution */}
				<div className="w-full lg:w-1/2 min-h-[25vh] bg-[#F5F5F5] p-4 shadow-md rounded-lg">
					<Doughnut data={courseData} options={chartOption2} />
				</div>
			</div>

			<div className="h-[30vh] flex mt-10 justify-center items-center">
				{/* Campus-wise Distribution */}
				<div className="flex w-full h-[30vh] justify-center items-center bg-[#F5F5F5] p-4 shadow-md rounded-lg">
					<Bar data={campusData} options={chartOption1} />
				</div>
			</div>

			{/* Charts Section */}
			<div className="bg-white p-5 mt-20 flex-wrap lg:flex-nowrap border-2 border-[rgba(7,72,115,0.1)] lg:gap-8 md:gap-8 items-start rounded-lg justify-center">
				{/* Total Numbers Section */}
				<h2 className="text-xl font-bold text-center mb-4">
					Campus Revenue & Sales
				</h2>
				<div className="flex flex-wrap lg:flex-nowrap justify-between gap-5 items-center w-full mt-8 mb-10">
					<div className="lg:w-[260px] w-full bg-[#002366] text-white border rounded-lg shadow-lg text-center p-5 hover:bg-[#001a4d] transition-colors duration-300">
						<h2 className="mb-3 ">{datas.salesData?.[0]?.campus}</h2>
						<p>
							Unit Sold:{" "}
							<span className="font-bold">
								{datas.salesData?.[0]?.unitsSold}
							</span>
						</p>
						<p>
							Total Revenue:{" "}
							<span className="font-bold">
								{datas.salesData?.[0]?.totalRevenue}
							</span>
						</p>
					</div>
					<div className="lg:w-[260px] w-full bg-[#008000] text-white border rounded-lg shadow-lg text-center p-5 hover:bg-[#006400] transition-colors duration-300">
						<h2 className="mb-3 ">{datas.salesData?.[1]?.campus}</h2>
						<p>
							Unit Sold:{" "}
							<span className="font-bold">
								{datas.salesData?.[1]?.unitsSold}
							</span>
						</p>
						<p>
							Total Revenue:{" "}
							<span className="font-bold">
								{datas.salesData?.[1]?.totalRevenue}
							</span>
						</p>
					</div>
					<div className="lg:w-[260px] w-full bg-[#800080] text-white border rounded-lg shadow-lg text-center p-5 hover:bg-[#660066] transition-colors duration-300">
						<h2 className="mb-3 ">{datas.salesData?.[2]?.campus}</h2>
						<p>
							Unit Sold:{" "}
							<span className="font-bold">
								{datas.salesData?.[2]?.unitsSold}
							</span>
						</p>
						<p>
							Total Revenue:{" "}
							<span className="font-bold">
								{datas.salesData?.[2]?.totalRevenue}
							</span>
						</p>
					</div>
					<div className="lg:w-[260px] w-full bg-[#FFD700] text-white border rounded-lg shadow-lg text-center p-5 hover:bg-[#c2a505] transition-colors duration-300">
						<h2 className="mb-3 ">{datas.salesData?.[3]?.campus}</h2>
						<p>
							Unit Sold:{" "}
							<span className="font-bold">
								{datas.salesData?.[3]?.unitsSold}
							</span>
						</p>
						<p>
							Total Revenue:{" "}
							<span className="font-bold">
								{datas.salesData?.[3]?.totalRevenue}
							</span>
						</p>
					</div>
					<div className="lg:w-[260px] w-full bg-[#FFA500] text-white border rounded-lg shadow-lg text-center p-5 hover:bg-[#c2a505] transition-colors duration-300">
						<h2 className="mb-3 ">
							{datas.salesData?.[4]?.campus === "UC-CS"
								? "UC-Main CS"
								: datas.salesData?.[4]?.campus}
						</h2>
						<p>
							Unit Sold:{" "}
							<span className="font-bold">
								{datas.salesData?.[4]?.unitsSold}
							</span>
						</p>
						<p>
							Total Revenue:{" "}
							<span className="font-bold">
								{datas.salesData?.[4]?.totalRevenue}
							</span>
						</p>
					</div>
				</div>

				{/* TOTAL REVENUE, TOTAL ATTENDEES */}
				<div className="mt-5 flex flex-row items-center w-full lg:w-full justify-center gap-5 lg:mt-0">
					<div className="w-[260px] bg-white border rounded-lg shadow-lg text-center p-5">
						<h2 className="mb-3 text-[#074873]">Total Revenue</h2>
						<h3>{datas.totalRevenue}</h3>
					</div>
					<div className="w-[260px] bg-white border rounded-lg shadow-lg text-center p-5">
						<h2 className="mb-3 text-[#074873]">Total of Attendees</h2>
						<h3>{datas.totalAttendees}</h3>
					</div>
				</div>
			</div>

			{/* Campus-wise Breakdown for Years */}
			<div className="mt-20">
				<h1 className="text-xl font-bold text-center mb-4">
					Student Registered by Campus
				</h1>
				<div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
					{/* UC Campus A */}
					<div className="bg-[#F5F5F5] p-3 shadow-md rounded-lg">
						<h3 className="text-md font-semibold text-center mb-2">
							UC-{datas?.yearLevelsByCampus?.[0]?.campus}
						</h3>
						<Bar data={campusAYearsData} options={chartOption1} />
					</div>
					{/* UC Campus B */}
					<div className="bg-[#F5F5F5] p-3 shadow-md rounded-lg">
						<h3 className="text-md font-semibold text-center mb-2">
							UC-{datas?.yearLevelsByCampus?.[1]?.campus}
						</h3>
						<Bar data={campusBYearsData} options={chartOption1} />
					</div>
					{/* UC Campus C */}
					<div className="bg-[#F5F5F5] p-3 shadow-md rounded-lg">
						<h3 className="text-md font-semibold text-center mb-2">
							UC-{datas?.yearLevelsByCampus?.[2]?.campus}
						</h3>
						<Bar data={campusCYearsData} options={chartOption1} />
					</div>
					{/* UC Campus D */}
					<div className="bg-[#F5F5F5] p-3 shadow-md rounded-lg">
						<h3 className="text-md font-semibold text-center mb-2">
							UC-{datas?.yearLevelsByCampus?.[3]?.campus}
						</h3>
						<Bar data={campusDYearsData} options={chartOption1} />
					</div>
					<div className="bg-[#F5F5F5] p-3 shadow-md rounded-lg">
						<h3 className="text-md font-semibold text-center mb-2">
							UC-Main {datas?.yearLevelsByCampus?.[4]?.campus}
						</h3>
						<Bar data={campusEYearsData} options={chartOption1} />
					</div>
				</div>
			</div>

			{/* Attended Students Section */}
			<div className="mt-20 mb-5">
				<h2 className="text-2xl font-bold text-center mb-5">
					Attended Students Breakdown
				</h2>
				<div className="flex flex-wrap lg:flex-nowrap gap-8 items-center justify-center">
					<div className="flex flex-col gap-8 justify-center items-center w-full lg:w-[50%]">
						<div className="w-full h-[250px] bg-[#F5F5F5] p-3 shadow-md rounded-lg">
							<Doughnut
								data={attendedStudentYearsData}
								options={chartOption2}
							/>
						</div>
						<div className="w-full flex h-[280px] bg-[#F5F5F5] p-4 shadow-md justify-center items-center rounded-lg">
							<Bar data={attendedCampusData} options={chartOption1} />
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default Statistics;
