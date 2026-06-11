import React, {useState} from 'react'
import default_img from '../assets/upload_img.jpg'
import axios from 'axios'
import { backendUrl } from '../App'

const AddHotel = () => {
  const [image, setImage] = useState(null)
  const [name, setName] = useState("")
  const [description,setDescription] = useState("")
  const [price, setPrice] = useState("")

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!image) return alert('Please select an image')
    const fd = new FormData()
    fd.append('image', image)
    fd.append('name', name)
    fd.append('description', description)
    fd.append('price', price)
    try {
      const res = await axios.post(backendUrl + '/api/hotel/add', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      if (res.data?.success) {
        alert('Room added')
        setImage(null); setName(''); setDescription(''); setPrice('')
      } else {
        alert(res.data?.message || 'Error adding room')
      }
    } catch (err) {
      console.error(err)
      alert('Upload error')
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <div>
         <p> Upload Image</p>
         <div>
           <label htmlFor="image-input">
            <img src={!image ? default_img : URL.createObjectURL(image)} alt="upload preview" style={{cursor: 'pointer'}} />
            <input type="file" name="image" id="image-input" onChange={(e)=> setImage(e.target.files?.[0] ?? null)} style={{display: 'none'}} />
           </label>
          </div>
        </div>
        <div className='w-full'>
          <p className='mb-2 text-[22px]'>Room Name</p>
          <input type="text" placeholder='Enter Room Name' name="" id="" value={name} onChange={(e)=> setName(e.target.value)} className='w-full max-w-[500px] p-4 border border-gray-300 rounded' />
        </div>
        <div className='w-full'>
          <p className='mb-2 text-[22px]'> Description</p>
          <input type="text" placeholder='Enter Room Description' name="" id="" value={description} onChange={(e)=> setDescription(e.target.value)} className='w-full max-w-[500px] p-4 border border-gray-300 rounded' />
        </div>
        <div className='mt-4'>
          <p  className= 'mb-2 text-[22px]'>price</p>
          <input type="number" placeholder='40' name="" id="" value={price} onChange={(e)=> setPrice(e.target.value)} className='w-full max-w-[500px] p-4 border border-gray-300 rounded'/>
        </div>
        <div >
          <button type='submit' className='mt-6 px-20 py-3 bg-blue-900 rounded '>Add room</button>
        </div>
      </form>
    </div>
  )
}

export default AddHotel
