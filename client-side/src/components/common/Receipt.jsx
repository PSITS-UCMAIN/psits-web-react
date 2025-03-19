import React, { forwardRef } from "react";
import logo from "../../assets/images/psits-logo.png";
import "../../App.css";
import { format } from "date-fns";
import QRCode from "react-qr-code";
import { headDevPosition } from "../tools/clientTools";

export const formatString = (str, abbreviate = true) => {
  if (!str || typeof str !== "string") {
    return "Unknown";
  }

  const words = str.split(" ");
  let formattedString = "";

  if (abbreviate) {
    for (let i = 0; i < words.length - 1; i++) {
      formattedString += words[i].charAt(0) + ".";
    }
    formattedString += " " + words[words.length - 1];
  } else {
    formattedString = str;
  }

  return formattedString;
};

const Receipt = forwardRef(
  (
    {
      name,
      reference_code,
      cash,
      type,
      course,
      year,
      product_name,
      batch,
      size,
      variation,
      admin,
      qty,
      itemTotal,
      total,
      reprint,
      items,
      membership,
    },
    ref
  ) => (
    <div ref={ref} className="container mx-3">
      <div className="flex flex-row mt-4 items-center">
        <img className="h-20 w-15 mb-4" src={logo} alt="Logo" />
        <div className="flex flex-col ms-3 text-center">
          <h1 className="text-2xl">Official</h1>
          <h1 className="text-2xl">Receipt</h1>
        </div>
      </div>
      <h6 className="text-sm font-bold ps-1">University of Cebu Main Campus</h6>
      <p className="text-xs pb-7 ps-4">Sanciangko Street Cebu City, 6000</p>

      <div className="text-base">
        <p className="mb-2">
          <b>Name: </b>
          {name}
        </p>
        <p className="mb-2">
          <b>Course & Year: </b> {course} - {year}
        </p>

        {type !== "Order" && (
          <div>
            <hr className="my-2" />
            <p className="mb-2">
              <b>Item: </b>
              {type}
            </p>
            <p className="mb-2">
              <b>Qty: </b> {qty} <span className="float-right">₱{total}</span>
            </p>
            <p className="mb-2">
              <b>Sub-total: </b>{" "}
              {itemTotal === undefined ? "" : "₱" + `${total}`}
            </p>
          </div>
        )}

        {type === "Order" && (
          <>
            <hr className="my-2" />
            <span>Membership: {membership}</span>
            <hr className="my-2" />
            {batch && (
              <p className="mb-2">
                <b>Batch: </b> {batch}
              </p>
            )}
            {size && (
              <p className="mb-2">
                <b>Size: </b> {size}
              </p>
            )}
            {variation && (
              <p className="mb-2">
                <b>Variation: </b> {variation}
              </p>
            )}
            {items && items.length > 0 && (
              <div>
                <h3 className="text-lg font-bold mb-2">Items:</h3>
                <ul className="list-disc list-inside mb-4 text-sm">
                  {items.map((item, index) => (
                    <li key={index} className="mb-1">
                      <b>{formatString(item.product_name)}</b>: {item.quantity}{" "}
                      x ₱{item.price} = ₱{item.sub_total}
                      <div className="text-sm flex flex-col">
                        <span>
                          {item.variation ? "Color: " + item.variation : ""}
                        </span>
                        <span>{item.sizes ? "Size: " + item.sizes : ""}</span>
                        <span>{item.batch ? "Batch: " + item.batch : ""}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
        {reprint === true && (
          <p className="mb-2 text-sm">
            <b>Type: </b>
            Copy
          </p>
        )}
        {!reprint && (
          <div>
            {" "}
            <hr className="my-2" />
            <p>
              <b>Total:</b> ₱{total}
            </p>
            <p>
              <b>Cash:</b> ₱{cash}
            </p>
            <p>
              <b>Change:</b> ₱{(cash - total).toFixed(2)}
            </p>
          </div>
        )}

        <br />
        <h2 className="text-2xl">{reference_code}</h2>
        <p className="mb-2 text-lg">
          <b>Date: </b>
          {format(new Date(), "MMMM d, yyyy")}
        </p>
        <p className="mb-2 text-lg">
          <b>Managed by: </b>
          {formatString(admin)}
        </p>
        <br />
        <br />
      </div>
    </div>
  )
);

export default Receipt;
