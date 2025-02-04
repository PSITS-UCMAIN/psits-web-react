import PropTypes from "prop-types";
import { FaTimes } from "react-icons/fa";
import { useState, useEffect } from "react";

/**
 * Empty modal component that displays a modal dialog with a close button.
 *
 * @param {Object} props - The component props.
 * @param {React.ReactNode} props.children - The content to be displayed inside the modal.
 * @param {Function} props.onClose - The function to be called when the modal is closed.
 * @param {Boolean} props.showCloseButton - Flag to show or hide the close button.
 * @returns {JSX.Element} The rendered modal component.
 */
const Modal = ({ children, onClose, showCloseButton = true, className }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300); // Match the duration of the CSS transition
  };

  return (
    <div className={`fixed p-4 inset-0 flex items-center justify-center z-50 ${isVisible ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}>
      {/* When the background behind is clicked, the modal closes. */}
      <div
        className="fixed inset-0 bg-black bg-opacity-40 z-10"
        onClick={handleClose}
      ></div>

      <div 
        className={`
          ${className}
          bg-white rounded-xl shadow-xl 
          min-w-96 md:min-w-[450px] w-fit z-10 h-full
          overflow-hidden 
          transform transition-transform duration-300 ${isVisible ? 'scale-100' : 'scale-95'}
        `}
      >
        { /* The close button */
          showCloseButton && 
            <div className="flex justify-end p-2">
              <button 
                className="text-gray-500 hover:text-gray-700"
                onClick={handleClose}
              >
                <FaTimes/>
              </button>
            </div>
        }
        { children }
      </div>
    </div>
  )
}

Modal.propTypes = {
  children: PropTypes.node.isRequired,
  onClose: PropTypes.func,
  showCloseButton: PropTypes.bool,
  className: PropTypes.string
}

export default Modal;