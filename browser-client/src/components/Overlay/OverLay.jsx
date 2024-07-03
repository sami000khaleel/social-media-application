import React from 'react'

const OverLay = ({component}) => {
  return (
    <>
    <div  className="overlay-container d-flex justify-content-center align-items-center position-absolute">
        <div>
            {component}
            </div>
    </div>
    </>
    )
}

export default OverLay