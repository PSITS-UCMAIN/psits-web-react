import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Title,
  Tooltip,
} from "chart.js";
import { React, useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import { getDashboardStats } from "../../../api/admin";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const BarGraph = () => {
  const [year, setYear] = useState({
    year1: 0,
    year2: 0,
    year3: 0,
    year4: 0,
  });

  useEffect(() => {
    const callTotal = async () => {
      try {
        const response = await getDashboardStats();
        const {
          years: { year1, year2, year3, year4 },
        } = response;

        setYear({
          year1,
          year2,
          year3,
          year4,
        });
      } catch (error) {
        console.error("Failed to fetch data", error);
      }
    };

    callTotal();
  }, []);
  const colors = [
    "rgba(54, 162, 235, 0.7)", // Freshmen
    "rgba(255, 206, 86, 0.7)", // Sophomore
    "rgba(75, 192, 192, 0.7)", // Junior
    "rgba(153, 102, 255, 0.7)", // Senior
  ];

  const borderColors = [
    "rgba(54, 162, 235, 1)",
    "rgba(255, 206, 86, 1)",
    "rgba(75, 192, 192, 1)",
    "rgba(153, 102, 255, 1)",
  ];

  const data = {
    labels: ["Freshmen", "Sophomore", "Junior", "Senior"],
    datasets: [
      {
        label: "1",
        data: [year.year1, 0, 0, 0],
        backgroundColor: colors[0],
        borderColor: borderColors[0],
        borderWidth: 1,
      },
      {
        label: "2",
        data: [0, year.year2, 0, 0],
        backgroundColor: colors[1],
        borderColor: borderColors[1],
        borderWidth: 1,
      },
      {
        label: "3",
        data: [0, 0, year.year3, 0],
        backgroundColor: colors[2],
        borderColor: borderColors[2],
        borderWidth: 1,
      },
      {
        label: "4",
        data: [0, 0, 0, year.year4],
        backgroundColor: colors[3],
        borderColor: borderColors[3],
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            let label = context.dataset.label || "";
            if (label) {
              label += ": ";
            }
            if (context.parsed.y !== null) {
              label += `${context.parsed.y}`;
            }
            return label;
          },
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
      },
      y: {
        beginAtZero: true,
      },
    },
  };

  return (
    <div className="w-full  p-4">
      {" "}
      {/* Ensure full width and height, with padding */}
      <h2 className="text-xl sm:text-2xl text-[#074873] mb-4">Year Level</h2>
      <div className="w-full max-w-[90vw] sm:max-w-[80vw] md:max-w-[70vw] lg:max-w-[60vw] xl:max-w-[50vw] mx-auto">
        {/* Container for the chart */}
        <Bar data={data} options={options} />
      </div>
    </div>
  );
};

export default BarGraph;
