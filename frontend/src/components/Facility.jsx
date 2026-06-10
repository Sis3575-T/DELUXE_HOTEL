import React from 'react'
import { FaShuttleVan, FaParking, FaCocktail, FaWater, FaUtensils, FaSwimmingPool, FaHotTub, FaConciergeBell } from 'react-icons/fa'

const services = [
  {
    icon: <FaShuttleVan size={32} className="text-gray-600" />,
    title: 'Pick up & Drop',
    desc: 'Airport pick-up and drop-off for a seamless arrival and departure.'
  },
  {
    icon: <FaConciergeBell size={32} className="text-gray-600" />,
    title: '24/7 Reception',
    desc: 'Round-the-clock front desk service to assist your needs.'
  },
  {
    icon: <FaParking size={32} className="text-gray-600" />,
    title: 'Parking Space',
    desc: 'Secure on-site parking available for guests.'
  },
  {
    icon: <FaCocktail size={32} className="text-gray-600" />,
    title: 'Welcome Drink',
    desc: 'Complimentary welcome drink on arrival.'
  },
  {
    icon: <FaWater size={32} className="text-gray-600" />,
    title: 'Hot & Cold Water',
    desc: 'Hot and cold water available in rooms and facilities.'
  },
  {
    icon: <FaUtensils size={32} className="text-gray-600" />,
    title: 'Full Board',
    desc: 'Dining options covering breakfast, lunch, and dinner.'
  },
  {
    icon: <FaSwimmingPool size={32} className="text-gray-600" />,
    title: 'Swimming Pool',
    desc: 'Outdoor pool for relaxation and leisure.'
  },
  {
    icon: <FaHotTub size={32} className="text-gray-600" />,
    title: 'Spa & Hot Tub',
    desc: 'Wellness services including a hot tub and spa treatments.'
  }
]
const Facility = () => {
  return (
    <div className='bg-[#f8f0eb] py-16 px-4 md:px-20'>
      <div className='mx-auto max-w-7xl'>
        <div className='mb-12'>
          <p className='text-sm tracking-widest uppercase text-gray-500'>Services</p>
          <h2 className='text-4xl font-serif font-semibold text-gray-800'>Facilities & Services</h2>
        </div>
        <div className='grid md:grid-cols-3 sm-grid-cols-2 gap-10'>
          {services.map((service, index) => (
            <div key={index} className='flex flex-col items-start space-y-3'>
              <div className='bg-lime-400 rounded-full p-5 text-black'>
                {service.icon}
              </div>
              <h3 className='text-2xl font-semibold text-gray-800'>{service.title}</h3>
              <p className='text-gray-500 max-w-xs text-sm'>{service.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Facility