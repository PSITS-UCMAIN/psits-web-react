import React from 'react';

const dummyData = [
  { name: 'John Doe' },
  { name: 'Jane Smith' },
  { name: 'Alice Johnson' },
  { name: 'Bob Brown' }
];

const Participant = () => {
  return (
    <div className="min-h-screen-half">
      <h1>Participants</h1>
      <ul>
        {dummyData.map((participant, index) => (
          <li key={index}>{participant.name}</li>
        ))}
      </ul>
    </div>
  );
};

export default Participant;