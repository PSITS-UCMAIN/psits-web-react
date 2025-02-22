import { useState, useEffect } from "react"
import { membership, merchandiseAdmin } from "../../api/admin"
import Modal from "../../components/common/modal/Modal"
import SearchDropdown from "../../components/common/search/SearchDropdown"
import PropTypes from "prop-types"
import TextInput from "../../components/common/TextInput"
import Button from "../../components/common/Button"

// Add Order Modal jud
const AddOrderModal = ({ 
  handleClose = () => {},
  onCreateOrder,
}) => {
  // options
  const [studentOptions, setStudentOptions] = useState([])
  const [merchOptions, setMerchOptions] = useState([])
  // formData
  const [student, setStudent] = useState()
  const [item, setItem] = useState()
  const [size, setSize] = useState("")
  const [variation, setVariation] = useState("")
  const [amount, setAmount] = useState(0)

  useEffect(() => {
    /* Merchandise Options */
    const fetchMerchOptions = async () => {
      const temp = await merchandiseAdmin();
      setMerchOptions(temp.map(opt => ({
        label: `${opt.name}`,
        value: opt
      })));
    }

    const fetchStudentOptions = async () => {
      try {
        const result = await membership();
        const options = result.filter(student => student.membership === "None").map(student => ({
          label: `${student.id_number} - ${student.first_name} ${student.last_name}`,
          value: student
        }))
        setStudentOptions(options);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    }

    fetchMerchOptions();
    fetchStudentOptions();
  }, [])

  const handleSizeClick = (size) => setSize(size);
  const handleVariationClick = (variation) => setVariation(variation);

  const createOrderHandler = () => {
    const formData = {
      student: student,
      item: item,
      amount: amount,
      size: size,
      variation: variation,
    }

    onCreateOrder(formData)
  }

  return (
    <Modal onClose={handleClose}>
      <div className="flex flex-col gap-2 p-4 h-full">
        <h1 className="text-2xl font-semibold"> Add Order </h1>
        <SearchDropdown
          label="Student"
          placeholder="Search ID Number..." 
          options={studentOptions} 
          onOptionSelect={(opt) => setStudent(opt ? opt.value : null)} />
        <SearchDropdown 
          label="Item"
          placeholder="Search Item Name..." 
          options={merchOptions} 
          onOptionSelect={(opt) => setItem(opt ? opt.value : null)}
          />
        <TextInput
          label="Amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(parseInt(e.target.value))}
          placeholder="Amount"
        />



        {/* Order specific functions should be here */}
        {/* If item is t-shirt */}
          { item &&
            /* If type is Uniform, Tshirt, or Tshirt w/ Bundle */
            (item.type === "Uniform" || item.type === "Tshirt" || item.type === "Tshirt w/ Bundle" )
              ? <div>
                  <p className="font-semibold">Select Size:</p>
                  <div className="flex gap-2 flex-wrap">
                    {item.selectedSizes.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => handleSizeClick(s)}
                        className={`p-2 border rounded ${
                          size === s
                            ? "bg-blue-500 text-white"
                            : "bg-white text-gray-800"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  <p className="font-semibold">Variations:</p>
                  <div className="flex gap-2 flex-wrap text-sm">
                    {item.selectedVariations.map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => handleVariationClick(v)}
                        className={`p-2 border rounded ${
                          variation === v
                            ? "bg-blue-500 text-white"
                            : "bg-white text-gray-800"
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              : <></>
          }
        <Button size="full" onClick={createOrderHandler}>Create Order</Button>
      </div>
    </Modal>
  )
}

AddOrderModal.propTypes = {
  handleClose: PropTypes.func,
  studentOptions: PropTypes.array,
  merchOptions: PropTypes.array,
  setSelectedStudent: PropTypes.func,
  setSelectedItem: PropTypes.func,
  selectedItem: PropTypes.object,
  onCreateOrder: PropTypes.func.isRequired
}

export default AddOrderModal