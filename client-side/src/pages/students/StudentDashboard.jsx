import backendConnection from "../../api/backendApi";
import { fetchSpecificStudent } from "../../api/students";
import MembershipBanner from "./dashboard/Membership";
import OperationHours from "./dashboard/OperationHours";
import { merchandise } from "../../api/admin";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getInformationData } from "../../authentication/Authentication";
import { Link } from "react-router-dom";
import { getEvents } from "../../api/event";
import ads from "../../assets/images/ads.png";

const Skeleton = ({ className }) => (
  <div className={`animate-pulse bg-gray-200 ${className}`}></div>
);

const StudentDashboard = () => {
  const userData = getInformationData();
  const [isRequest, setIsRequest] = useState(false);
  const [products, setProducts] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const currentDate = new Date();
  const end = new Date(currentDate.getFullYear(), 3, 30);

  const fetchAllEvents = async () => {
    const result = await getEvents();
    if (result) {
      setEvents(result.data);
    }
  };

  const handleFetchSpecificStudent = async () => {
    try {
      const result = await fetchSpecificStudent(userData.id_number);
      if (result) setIsRequest(result.isRequest);
    } catch (error) {
      console.error("Error fetching student data:", error);
    }
  };

  const fetchMerchandise = async () => {
    try {
      const result = await merchandise();
      const currentDate = new Date();

      const filteredProducts = result.filter((item) => {
        const startDate = new Date(item.start_date);
        const endDate = new Date(item.end_date);
        const selectedAudienceArray = item.selectedAudience.includes(",")
          ? item.selectedAudience.split(",").map((aud) => aud.trim())
          : [item.selectedAudience];

        return (
          currentDate <= endDate &&
          (selectedAudienceArray.some(
            (audience) => userData.audience.includes(audience) && !isRequest
          ) ||
            selectedAudienceArray.includes("all"))
        );
      });

      setProducts(filteredProducts);
    } catch (error) {
      console.error("Error fetching merchandise:", error);
    }
  };

  useEffect(() => {
    setLoading(true);
    const fetchData = async () => {
      await Promise.all([
        fetchMerchandise(),
        fetchAllEvents(),
        handleFetchSpecificStudent(),
      ]);
      setLoading(false);
    };
    fetchData();
  }, [isRequest]);

  return (
    <div className="max-w-[1600px] mx-auto grid grid-cols-1 py-5 md:grid-cols-2 lg:grid-cols-7 lg:flex gap-6">
      {loading ? (
        <>
          <Skeleton className="h-[280px] md:col-span-2 lg:col-span-3 xl:col-span-2 lg:row-span-2" />
          <Skeleton className="h-[150px] md:col-span-2 lg:col-span-4 xl:col-span-5" />
          <Skeleton className="h-[400px] col-span-full" />
        </>
      ) : (
        <>
          {/* Right Section (Operation Hours & Membership Banner) */}
          <div className="lg:order-last md:order-last">
            <OperationHours styles="self-start lg:col-start-6 lg:col-end-8 lg:row-start-1 lg:row-end-3 mb-3" />
            <MembershipBanner styles="lg:row-start-3 lg:col-start-6 lg:col-end-8" />
            {currentDate <= end && (
              <div className="lg:row-start-3 lg:col-start-6 lg:col-end-8 mt-2 rounded-lg overflow-hidden shadow-lg">
                <img src={ads} alt="ads" className="w-full h-40 object-cover" />
              </div>
            )}
          </div>

          {/* Left Section (Carousel & Events) */}
          <div className="lg:w-full">
            {products.length > 0 && <DynamicAdCarousel products={products} />}
            <EventDetails events={events} />
          </div>
        </>
      )}
    </div>
  );
};
const DynamicAdCarousel = ({ products }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (products.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % products.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [products.length]);

  return (
    <div className="relative w-full max-w-lg mx-auto rounded-lg overflow-hidden shadow-lg">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.5 }}
          className="relative"
        >
          <div className="w-full h-64">
            <img
              src={products[currentIndex]?.imageUrl[0]}
              alt="Ad"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="absolute inset-0 bg-black bg-opacity-40 flex flex-col justify-center items-center text-white p-4">
            <motion.h2
              className="text-2xl font-bold text-center"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              {products[currentIndex]?.name}
            </motion.h2>
            <motion.p
              className="text-center text-sm mt-2"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.7 }}
            >
              {products[currentIndex]?.description}
            </motion.p>
            <Link to="/student/merchandise">
              <motion.button
                className="mt-4 px-4 py-2 bg-[#368ec9] text-white rounded-lg shadow-lg hover:bg-[#074873] transition-all"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                Shop Now
              </motion.button>
            </Link>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
const EventDetails = ({ events }) => {
  const [showAll, setShowAll] = useState(false);
  const [showDescription, setShowDescription] = useState({});

  const toggleDescription = (index) => {
    setShowDescription((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  return (
    <div className="max-w-xl mt-7 mx-auto p-6 bg-white border rounded-lg shadow-lg">
      <h2 className="text-xl font-bold text-center text-[#074873] mb-4">
        Upcoming Events
      </h2>
      <div className="space-y-4">
        {events.slice(0, showAll ? events.length : 3).map((event, index) => (
          <div
            key={index}
            className="items-center p-4 border border-blue-200 rounded-lg flex flex-col"
          >
            <div className="flex gap-2 text-[#074873] w-full">
              <div className="w-10 h-10 flex items-center justify-center border border-[#074873] rounded-full">
                <i className="far fa-calendar"></i>
              </div>
              <p className="text-sm font-semibold mt-2">{event.eventName}</p>
            </div>
            <div className="pl-1 w-full">
              <p className="text-xs sm:text-sm text-gray-700">
                <span className="font-semibold">
                  {showDescription[index]
                    ? event.eventDescription
                    : `${event.eventDescription.slice(0, 50)}...`}
                </span>
                {event.eventDescription.length > 50 && (
                  <span
                    className="text-blue-500 cursor-pointer ml-1"
                    onClick={() => toggleDescription(index)}
                  >
                    {showDescription[index] ? " Show less" : " Read more"}
                  </span>
                )}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {new Date(event.eventDate).toLocaleDateString()}
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 text-center">
        {!showAll && events.length > 3 && (
          <button
            onClick={() => setShowAll(true)}
            className="text-xs px-4 py-2 bg-[#074873] hover:bg-[#1E6F8C] text-white font-semibold rounded-lg shadow-md transition-all duration-300 ease-in-out"
          >
            View All Events
          </button>
        )}
        {showAll && (
          <button
            onClick={() => setShowAll(false)}
            className="mt-4 px-4 py-2 bg-red-700 text-white font-semibold rounded-full shadow-md hover:bg-red-800 transition-all duration-300 ease-in-out"
          >
            <i className="fas fa-times"></i>
          </button>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;
