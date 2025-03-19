import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { getEvents } from "../../../api/event";
import { MdOutlineQueryStats, MdOutlineCardGiftcard } from "react-icons/md"; // Add the new icon import
import { getInformationData } from "../../../authentication/Authentication";
import { formatDate } from "../../../utils/stringUtils";
import { InfinitySpin } from "react-loader-spinner";

function Events() {
	const [events, setEvent] = useState([]);
	const admin = getInformationData();
	const [isLoading, setIsLoading] = useState(false);

	const handleGetEvents = async () => {
		setIsLoading(true);
		try {
			const response = await getEvents();
			setEvent(response.data ? response.data : []);
			setIsLoading(false);
		} catch (error) {
      console.error(error);
      window.location.reload();
			setIsLoading(false);
		}
	};

	useEffect(() => {
		handleGetEvents();
	}, []);

	return (
		<div className="">
			{isLoading ? (
				<div className="flex justify-center items-center h-60vh">
					<InfinitySpin
						visible={true}
						width={200}
						color="#0d6efd"
						ariaLabel="infinity-spin-loading"
					/>
				</div>
			) : (
				<div className="mt-5 grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2x1:grid-cols-6  ">
					{events &&
						events.map((event) => (
							<div className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 ">
								<div className="relative w-full h-48 mb-3">
									<img
										src={event.eventImage[0]}
										alt={event.eventName}
										className="w-full h-full object-cover"
									/>
								</div>
								<div className=" pr-4 pl-4 pb-4">
									<h1 className=" text-lg font-semibold text-gray-800 truncate">
										{event.eventName}
									</h1>
									<p className="mb-3 text-[074873]">
										{formatDate(event.eventDate)}
									</p>
									<div className="flex gap-1 items-center justify-center">
										<Link
											to={`/admin/attendance/${event.eventId}`}
											className={
												admin.campus === "UC-Main"
													? "w-[80%] h-full"
													: "w-full h-full"
											}>
											<button
												className="w-full h-full bg-[#002E48] hover:bg-[#013e61] text-white text-sm font-medium py-2 px-4 rounded-md cursor-pointer hover:scale-105 transition-transform duration-200"
												tabIndex="0">
												View
											</button>
										</Link>

										<Link
											to={`/admin/statistics/${event.eventId}`}
											className="h-full">
											<button
												className="w-full h-full border border-[#002E48] bg-white hover:bg-[#013e61] hover:text-white text-[#002E48] text-sm font-medium py-2 px-4 rounded-md cursor-pointer hover:scale-105 transition-transform duration-200"
												tabIndex="1">
												<MdOutlineQueryStats />
											</button>
										</Link>

										{admin.campus === "UC-Main" && (
											<Link
												to={`/admin/raffle/${event.eventId}`}
												className="h-full">
												<button
													className="w-full h-full border border-[#002E48] bg-white hover:bg-[#013e61] hover:text-white text-[#002E48] text-sm font-medium py-2 px-4 rounded-md cursor-pointer transition-colors duration-200 hover:scale-105"
													tabIndex="2">
													<MdOutlineCardGiftcard />
												</button>
											</Link>
										)}
									</div>
								</div>
							</div>
						))}
				</div>
			)}
		</div>
	);
}

export default Events;
