const OrderTable = ({ data }) => {
    if (!data || data.length === 0) {
      return <div className="text-center p-4">No pending orders</div>;
    }
    const getYearSuffix = (year) => {
      if (year === 1) return "1st";
      if (year === 2) return "2nd";
      if (year === 3) return "3rd";
      return `${year}th`;
    };
  return (
      <div className="max-w-full mx-auto overflow-x-auto max-h-36 border rounded-lg shadow-md">
          <table className="w-full text-sm text-center border-collapse">
              <thead className="bg-[#074873] text-white sticky top-0">
                  <tr>
                      <th className="p-2 border-b">Order Name</th>
                      <th className="p-2 border-b">Quantity</th>
                      {data[0]?.yearCounts.map((_, index) => (
                          <th key={index} className="p-2 border-b">{`${getYearSuffix(index + 1)} Year`}</th>
                      ))}
                  </tr>
              </thead>
              <tbody>
                  {data.map((order, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                          <td className="p-2 text-left">{order.product_name}</td>
                          <td className="p-2 text-center">{order.total}</td>
                          {order?.yearCounts.map((year, idx) => (
                              <td key={idx} className="p-2 text-center">
                                  {year} 
                              </td>
                          ))}
                      </tr>
                  ))}
              </tbody>
          </table>
      </div>
  );
  };
  
  export default OrderTable;
  