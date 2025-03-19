import { getOrderDate } from "../../../api/admin";
import { Chart as ChartJS, Title, Tooltip, Legend, ArcElement } from "chart.js";
import React, { useState, useEffect } from "react";
import { Pie } from "react-chartjs-2";

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await getOrderDate();

        if (Array.isArray(result) && result.length) {
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
                ],
                borderColor: "#fff",
                borderWidth: 1,
              },
            ],
            subtotal,
          });
        } else {
          console.error("Unexpected data format", result);
        }
      } catch (error) {
        console.error("Failed to fetch data", error);
      }
    };

    fetchData();
  }, []);

  const options = {
    responsive: true,
    plugins: {
      legend: { position: "top" },
      tooltip: {
        callbacks: {
          label: function (context) {
            const index = context.dataIndex;
            const subtotal = chartData?.subtotal[index] || 0;
            return `${context.label}: ${context.raw} orders | Subtotal: ₱${subtotal}`;
          },
        },
      },
    },
  };

  return (
    <div className="text-center">
      <h2 className="text-sm sm:text-xl text-[#074873]">
        Daily Sales Distribution
      </h2>
      {chartData ? (
        <Pie data={chartData} options={options} />
      ) : (
        <p>No data available</p>
      )}
    </div>
  );
};

export default PieChart;
