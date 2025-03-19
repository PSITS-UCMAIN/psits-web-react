import React from 'react';
import { motion } from 'framer-motion';
import ucImage from '../../../assets/images/UC_logo 1.png';
import ccsImage from '../../../assets/images/ucmncsps.Cl3Tq_j--removebg-preview.png';

const ucMissionVision = [
  {
    type: 'Mission',
    text: 'The University offers affordable and quality education responsive to the demands of local and international communities.',
  },
  {
    type: 'Vision',
    text: 'Democratize quality education. Be the visionary and industry leader. Give hope and transform lives.',
  },
];

const ccsMissionVision = [
  {
    type: 'Mission',
    text: 'We envision being the hub of quality, globally-competitive and socially-responsive information technology education.',
  },
  {
    type: 'Vision',
    text: `We commit to continuously:
      - Offer relevant programs that mold well-rounded computing professionals;
      - Engage in accreditation and quality standards;
      - Facilitate in building an IT-enabled nation.`,
  },
];

// Animation Variants
const containerVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.5,
      staggerChildren: 0.25,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: 'easeOut',
    },
  },
};

const MissionVision = () => {
  return (
    <section className="py-10 md:py-20 bg-gray-100">
      <div className="container mx-auto flex flex-col lg:flex-row gap-8 lg:gap-16">
        {/* UC Mission & Vision */}
        <motion.div
          className="p-6 sm:p-8 lg:p-12 bg-gradient-to-r from-primary to-[#f2f2f2] text-white relative overflow-hidden"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <img
            src={ucImage}
            className="absolute opacity-10 -right-32 -bottom-32 w-2/3 lg:w-1/2"
            alt="UC Logo"
          />
          <motion.h2
            className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-6 border-b-2 border-white pb-3"
            variants={itemVariants}
          >
            University of Cebu
          </motion.h2>
          {ucMissionVision.map((item, index) => (
            <motion.div key={index} className="mb-6" variants={itemVariants}>
              <h3 className="text-xl sm:text-2xl font-semibold mb-3">
                {item.type}
              </h3>
              <p className="text-base sm:text-lg leading-relaxed">
                {item.text}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* CCS Mission & Vision */}
        <motion.div
          className="p-6 sm:p-8 lg:p-12 bg-gradient-to-r from-secondary to-[#f2f2f2] text-dark relative overflow-hidden"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <img
            src={ucImage}
            className="absolute opacity-10 -right-32 -bottom-32 w-2/3 lg:w-1/2"
            alt="UC Logo"
          />
          <motion.h2
            className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-6 border-b-2 border-success pb-3"
            variants={itemVariants}
          >
            College of Computer Studies
          </motion.h2>
          {ccsMissionVision.map((item, index) => (
            <motion.div key={index} className="mb-6" variants={itemVariants}>
              <h3 className="text-xl sm:text-2xl font-semibold mb-3 text-success">
                {item.type}
              </h3>
              <p className="text-base sm:text-lg leading-relaxed whitespace-pre-line">
                {item.text}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default MissionVision;
