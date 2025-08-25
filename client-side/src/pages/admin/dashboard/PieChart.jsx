import { getDailySales } from "../../../api/admin";
import { Chart as ChartJS, Title, Tooltip, Legend, ArcElement } from "chart.js";
import React, { useState, useEffect } from "react";
import { Pie } from "react-chartjs-2";
import { InfinitySpin } from "react-loader-spinner";

ChartJS.register(Title, Tooltip, Legend, ArcElement);

export const formatString = (str, abbreviate = true) => {
  if (!str || typeof str !== "string") return "Unknown";

  const words = str.split(" ");
  return abbreviate
    ? words
        .slice(0, -1)
        .map((w) => w.charAt(0) + ".")
        .join(" ") +
        " " +
        words.at(-1)
    : str;
};

const PieChart = () => {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await getDailySales();

        // Validate the response structure
        if (!Array.isArray(result)) {
          throw new Error("Expected array but got " + typeof result);
        }

        if (result.length === 0) {
          setChartData(null);
          setError("No data available for the selected period");
          return;
        }

        // Check required fields exist in each item
        const isValidData = result.every(
          (item) =>
            item.product_name !== undefined &&
            item.totalQuantity !== undefined &&
            item.totalSubtotal !== undefined
        );

        if (!isValidData) {
          throw new Error("Invalid data structure from API");
        }

        const labels = result.map((item) => formatString(item.product_name));
        const data = result.map((item) => item.totalQuantity);
        const subtotal = result.map((item) => item.totalSubtotal);

        setChartData({
          labels,
          datasets: [
            {
              label: "Number of Orders by Product",
              data,
              backgroundColor: [
                "#FF6384",
                "#36A2EB",
                "#FFCE56",
                "#4BC0C0",
                "#9966FF",
                "#FF9F40",
              ].slice(0, result.length), // Only use as many colors as needed
              borderColor: "#fff",
              borderWidth: 1,
            },
          ],
          subtotal,
        });
      } catch (error) {
        console.error("Failed to fetch data", error);
        setError(error.message || "Failed to load chart data");
        setChartData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
        labels: {
          padding: 20,
          boxWidth: 12,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            if (!chartData?.subtotal) return `${context.label}: ${context.raw}`;
            const index = context.dataIndex;
            const subtotal = chartData.subtotal[index] || 0;
            return `${context.label}: ${
              context.raw
            } orders | Subtotal: ₱${subtotal.toFixed(2)}`;
          },
        },
      },
    },
  };

  return (
    <div className="text-center p-4">
      <h2 className="text-sm sm:text-xl text-[#074873] mb-4">
        Daily Sales Distribution
      </h2>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <p>Loading chart data...</p>
          <InfinitySpin width="200" color="#3B82F6" />
        </div>
      ) : error ? (
        <div className="text-red-500 p-4 bg-red-50 rounded">{error}</div>
      ) : chartData ? (
        <div className="max-w-full mx-auto" style={{ height: "400px" }}>
          <Pie data={chartData} options={options} height={400} />
        </div>
      ) : (
        <div className="p-4 bg-gray-50 rounded">
          <p>No data available to display</p>
        </div>
      )}
    </div>
  );
};

export default PieChart;
