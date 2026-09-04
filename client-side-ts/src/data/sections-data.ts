import {
  Lightbulb,
  HeartHandshake,
  Award,
  Bell,
  Code2,
  Users2,
  BookOpen,
  Calendar,
  Trophy,
} from "lucide-react";
import Dennis from "../assets/Faculty/15.png";
import Jia from "../assets/Faculty/16.png";
import Tadlip from "../assets/Core Officers 2025/1.png";
import Tuyor from "../assets/Core Officers 2025/2.png";
import Alon from "../assets/Core Officers 2025/3.png";
import Español from "../assets/Core Officers 2025/5.png";
import Peresores from "../assets/Core Officers 2025/6.png";
import Laygan from "../assets/Core Officers 2025/7.png";
import Penera from "../assets/Core Officers 2025/9.png";
import Postrero from "../assets/Core Officers 2025/8.png";
import Cabunilas from "../assets/Core Officers 2025/10.png";
import Laurito from "../assets/Core Officers 2025/13.png";
import Rallos from "../assets/Core Officers 2025/12.png";
import Villanueva from "../assets/Core Officers 2025/14.png";

import Genabio from "../assets/Development Team 2025/28.png";
import Napisa from "../assets/Development Team 2025/19.png";
import Dilao from "../assets/Development Team 2025/17.png";
import Igot from "../assets/Development Team 2025/18.png";
import Alin from "../assets/Development Team 2025/20.png";
import Barral from "../assets/Development Team 2025/22.png";
import Laroco from "../assets/Development Team 2025/21.png";
import Albeos from "../assets/Development Team 2025/23.png";
import PersonPlaceholder from "../assets/person_placeholder.png";

import FreshmanOrientation26 from "../assets/freshmen-orientation26/Orientation26-Cover.jpg";
import ICTCongress26 from "../assets/ict-congress-2026/ict26_1.jpg";
import CSSGitTogether from "../assets/gittogether/ccsgittogether.jpg";
import CCSDays26 from "../assets/ccsdays26/ccsdays26_1.jpg";
import Intrams25 from "../assets/intrams25/intrams25_1.jpg";
import ProjectExhibit25 from "../assets/project-exhibit25/2.jpg";
import Orientation from "../assets/orientation2025/1.jpg";
import ICT from "../assets/ict-congress/1.jpg";
import Blockchain from "../assets/cebu-blockchain-conference/1.jpg";
import CCSDays from "../assets/awarding/1.jpg";
import Nihonggo from "../assets/nihonggo/1.jpg";
import EmbeddedSystems from "../assets/embedded/1.jpg";
import UCCCSCares from "../assets/embedded/1.jpg";
import UCIntramurals from "../assets/intramurals/1.jpg";
import CCSAcquaintance from "../assets/acquaintance-party/CCS 4 (28).jpg";
import AnnouncementImage from "../assets/orientation2025/1.jpg";
import CollaborationImage from "../assets/ict-congress/4.jpg";
import SocialConnectionsImage from "../assets/cebu-blockchain-conference/5.jpg";
import EventsImage from "../assets/orientation2025/18.jpg";
import LearningResourcesImage from "../assets/orientation2025/3.jpg";
import CompetitionsImage from "../assets/awarding/4.jpg";

// --- Home Banner Data ---
export const homeBannerData = {
  title: {
    normal: "Empowering",
    highlight: "future IT Professionals",
  },
  description:
    "We are a community of like-minded individuals who are passionate about technology and committed to making a difference in the world.",
  buttons: {
    primary: "Join Now",
    secondary: "Learn More",
  },
  image: {
    alt: "Hero Banner",
  },
};

// --- Core Values Data ---
export const coreValuesData = [
  {
    title: "Innovation",
    keywords: "Visionary • Leadership • Change",
    icon: Lightbulb,
  },
  {
    title: "Initiative",
    keywords: "Wit • Practicality • Ingenuity",
    icon: HeartHandshake,
  },
  {
    title: "Service",
    keywords: "Industry • Loyalty • Courtesy",
    icon: Award,
  },
];

// --- Get Involved Data ---
export const getInvolvedData = {
  header: {
    subtitle: "Join the Community",
    titlePrefix: "Get",
    titleSuffix: "Involved",
    description:
      "Learning, collaborating, and connecting within the organization. Join our community and shape the future of technology together.",
    memberCount: "500+",
  },
  cards: [
    {
      title: "Announcements",
      description:
        "Don't miss out! Stay updated on PSITS-hosted workshops, hackathons, and more events. Follow us for more details!",
      icon: Bell,
      image: AnnouncementImage,
      className: "h-full",
    },
    {
      title: "Collaborations",
      description:
        "Unleash your potential! Aspiring Developers, collaborate with us on cutting-edge projects on GitHub.",
      icon: Code2,
      image: CollaborationImage,
      className: "h-full",
    },
    {
      title: "Social Connections",
      description:
        "Build friendships, find mentors, and grow your network. Connect with like-minded peers and future colleagues!",
      icon: Users2,
      image: SocialConnectionsImage,
      className: "h-full",
    },
    {
      title: "Events & Activities",
      description:
        "From hackathons to seminars, participate in exciting events that sharpen your skills and expand your horizons.",
      icon: Calendar,
      image: EventsImage,
      className: "h-full",
    },
    {
      title: "Learning Resources",
      description:
        "Access exclusive tutorials, study materials, and guides curated by fellow students and industry professionals.",
      icon: BookOpen,
      image: LearningResourcesImage,
      className: "h-full",
    },
    {
      title: "Competitions",
      description:
        "Challenge yourself in coding contests, UI/UX battles, and tech quizzes. Showcase your talents and win prizes!",
      icon: Trophy,
      image: CompetitionsImage,
      className: "h-full",
    },
  ],
};

// --- Goal Section Data ---
export const goalSectionData = {
  title: "Goals",
  subtitle: "What we strive to achieve",
  goals: [
    {
      title: "Ethical Development",
      description:
        "Promotes scholarly endeavors for the promotion of moral, social, cultural, and environmental interests.",
    },
    {
      title: "Career",
      description:
        "Meets the demands of the industry in terms of technical, personal and interpersonal skills.",
    },
    {
      title: "Resource Optimization",
      description:
        "Optimizes the use of appropriate and advanced resources and services.",
    },
    {
      title: "Research",
      description:
        "Conducts intellectual, technological and significant researches in computing.",
    },
  ],
};

// --- Institutional Identity Data ---
export interface UCData {
  title: string;
  subtitle: string;
  stats: { value: string; label: string }[];
  mission: string;
  vision: string;
}

export interface CCSData {
  title: string;
  subtitle: string;
  mission: string;
  vision: {
    intro: string;
    points: string[];
  };
}

export interface InstitutionalIdentityData {
  uc: UCData;
  ccs: CCSData;
}

export const institutionalIdentityData: InstitutionalIdentityData = {
  uc: {
    title: "University of Cebu",
    subtitle: "Mission & Vision",
    stats: [
      { value: "60,000+", label: "students" },
      { value: "1964", label: "founded" },
      { value: "9", label: "departments" },
    ],
    mission:
      "The University offers affordable and quality education responsive to the demands of local and international communities.",
    vision:
      "Democratize quality education. Be the visionary and industry leader. Give hope and transform lives.",
  },
  ccs: {
    title: "College of Computer Studies",
    subtitle: "Mission & Vision",
    mission:
      "We envision being the hub of quality, globally-competitive and socially-responsive information technology education.",
    vision: {
      intro: "We commit to continuously:",
      points: [
        "Offer relevant programs that mold well-rounded computing professionals",
        "Engage in accreditation and quality standards;",
        "Facilitate in building an IT-enabled nation.",
      ],
    },
  },
};

// --- Dean's Message Data ---
export const deansMessageData = {
  header: {
    subtitle: "Leadership",
    title: "Dean's Message",
  },
  paragraphs: [
    "As the Dean of our esteemed college, we're thrilled to have you here. I am committed to fostering a supportive and dynamic learning environment where you can thrive.",
    "Explore the many opportunities available, from internships to hackathons, to gain valuable real-world experience and develop your skills. We encourage active participation and collaboration – your voice matters!",
    "We're here to help you succeed in this ever-evolving field. Best wishes for an amazing academic journey!",
  ],
  signature: {
    name: "Mr. Neil Basabe",
    role: "Dean - UC Main CSS",
  },
};

// --- Events Data ---
export interface EventItem {
  id: number;
  title: string;
  location: string;
  image: string;
  startDateTime: string; // ISO string with explicit +08:00 (Asia/Manila) offset
  endDateTime: string; // ISO string with explicit +08:00 (Asia/Manila) offset
  description: string;
}

export const eventsData: { events: EventItem[] } = {
  events: [
    {
      id: 1,
      title: "CCS Freshmen Orientation 2026",
      location: "University of Cebu Jones 15th Floor",
      image: FreshmanOrientation26,
      startDateTime: "2026-08-24T08:00:00+08:00",
      endDateTime: "2026-08-24T17:00:00+08:00",
      description:
        "The CCS Freshmen Orientation 2026 welcomed new College of Computer Studies students at the University of Cebu Jones 15th Floor, introducing them to the college's programs, faculty, and student organizations to help them start their academic journey with confidence.",
    },
    {
      id: 14,
      title: "12th Cebu ICT Congress 2026",
      location: "New Cebu Coliseum Cebu City",
      image: ICTCongress26,
      startDateTime: "2026-04-22T00:00:00+08:00",
      endDateTime: "2026-04-22T23:59:59+08:00",
      description:
        "The 12th ICT Congress gathered students from the University of Cebu campuses on April 22, 2026, at the Cebu Coliseum for a day of innovation, collaboration, and learning. Participants explored emerging technologies, shared ideas through exhibits and presentations, and demonstrated the CCS core values of initiative, innovation, and service while connecting with fellow future IT professionals.",
    },
    {
      id: 13,
      title: "CCS Git Together 2026",
      location: "Mandani Bay",
      image: CSSGitTogether,
      startDateTime: "2026-03-28T00:00:00+08:00",
      endDateTime: "2026-03-28T23:59:59+08:00",
      description:
        "CCS Git Together 2026 brought the College of Computer Studies community together for an evening of celebration, connection, and unforgettable memories on March 28, 2026, at Mandani Bay. With the theme Black and White, students, faculty, and staff enjoyed a night of music, entertainment, and camaraderie, strengthening friendships and fostering a greater sense of unity within the department.",
    },
    {
      id: 12,
      title: "UC Intramurals 2025-2026",
      location: "University of Cebu Main Campus",
      image: Intrams25,
      startDateTime: "2026-03-04T00:00:00+08:00",
      endDateTime: "2026-03-04T23:59:59+08:00",
      description:
        "The UC Intramurals 2025–2026 brought together students from different departments for three days of sports, performances, and school spirit at the University of Cebu Main Campus from March 4–6, 2026. CCS students proudly represented their department, demonstrating teamwork, determination, and camaraderie in various competitions while fostering lasting memories throughout the event.",
    },
    {
      id: 11,
      title: "CCS Days Competition 2026",
      location: "University of Cebu Main Campus",
      image: CCSDays26,
      startDateTime: "2026-03-02T00:00:00+08:00",
      endDateTime: "2026-03-02T23:59:59+08:00",
      description:
        "CCS Days Competition 2026 gathered aspiring tech students for two days of exciting competitions held on March 2–3, 2026. Participants showcased their skills in programming, UI/UX design, networking, hackathon challenges, and the General IT Quiz, demonstrating creativity, problem-solving, teamwork, and technical excellence while competing for the opportunity to represent the college in future events.",
    },
    {
      id: 10,
      title: "AI-Driven Embedded Systems Project Exhibit 2025",
      location: "University of Cebu Main Campus",
      image: ProjectExhibit25,
      startDateTime: "2025-12-18T00:00:00+08:00",
      endDateTime: "2025-12-18T23:59:59+08:00",
      description:
        "The College of Computer Studies (CCS) at the University of Cebu Main Campus showcased innovative student projects during the AI-Driven Embedded Systems Project Exhibit 2025 held on December 18, 2025. The exhibit highlighted AI-powered embedded systems developed by students, demonstrating their technical skills, creativity, and innovative solutions to real-world problems.",
    },
    {
      id: 9,
      title: "CCS Freshman Orientation 2025",
      location: "University of Cebu Main Campus",
      image: Orientation,
      startDateTime: "2025-08-13T00:00:00+08:00",
      endDateTime: "2025-08-13T23:59:59+08:00",
      description:
        "The College of Computer Studies (CCS) at the University of Cebu Main Campus warmly welcomed its new batch of students during the CCS Orientation 2025 held on August 13, 2025. The event was designed to introduce freshmen to the college's programs, faculty, and student organizations.",
    },
    {
      id: 8,
      title: "11th ICT Congress 2025",
      location: "SM Seaside City Cebu",
      image: ICT,
      startDateTime: "2025-04-12T00:00:00+08:00",
      endDateTime: "2025-04-12T23:59:59+08:00",
      description:
        "The 11th ICT Congress 2025 at SM Seaside City Cebu was a landmark event that brought together IT enthusiasts, professionals, and students from across the region. The congress featured a series of keynote speeches, panel discussions, and workshops focused on the latest trends and innovations in information and communication technology.",
    },
    {
      id: 7,
      title: "CCS Days",
      location: "University of Cebu Main Campus",
      image: CCSDays,
      startDateTime: "2025-02-12T00:00:00+08:00",
      endDateTime: "2025-02-12T23:59:59+08:00",
      description:
        "CCS Days at the University of Cebu Main Campus was a vibrant celebration of technology, creativity, and community spirit. The event spanned several days and featured a variety of activities including coding competitions, hackathons, tech talks, and exhibitions showcasing student projects.",
    },
    {
      id: 6,
      title: "Cebu Blockchain Conference 2025",
      location: "IEC Convention Center Cebu",
      image: Blockchain,
      startDateTime: "2025-01-17T00:00:00+08:00",
      endDateTime: "2025-01-17T23:59:59+08:00",
      description:
        "The Cebu Blockchain Conference 2025 held at the IEC Convention Center Cebu was a groundbreaking event that delved into the transformative potential of blockchain technology. The conference attracted industry leaders, developers, entrepreneurs, and enthusiasts eager to explore the applications and implications of blockchain across various sectors.",
    },
    {
      id: 5,
      title: "Nihonggo Culminating Activity 2024",
      location: "University of Cebu Main Campus",
      image: Nihonggo,
      startDateTime: "2024-12-17T00:00:00+08:00",
      endDateTime: "2024-12-17T23:59:59+08:00",
      description:
        "The Nihonggo Culminating Activity 2024 at the University of Cebu Main Campus was a festive event that marked the conclusion of the Nihonggo language program for the year. The activity showcased the progress and achievements of students who had been studying the Japanese language and culture throughout the semester.",
    },
    {
      id: 4,
      title: "Embedded Systems and IOT Project Exhibit 2024",
      location: "University of Cebu Main Campus",
      image: EmbeddedSystems,
      startDateTime: "2024-11-17T00:00:00+08:00",
      endDateTime: "2024-11-17T23:59:59+08:00",
      description:
        "The Embedded Systems and IoT Project Exhibit 2024 at the University of Cebu Main Campus was an exciting event that highlighted the innovative projects developed by students in the fields of embedded systems and the Internet of Things (IoT). The exhibit provided a platform for students to showcase their creativity, technical skills, and problem-solving abilities.",
    },
    {
      id: 3,
      title: "UC CCS Cares and Internship 2024",
      location: "University of Cebu Main Campus",
      image: UCCCSCares,
      startDateTime: "2024-11-17T00:00:00+08:00",
      endDateTime: "2024-11-17T23:59:59+08:00",
      description:
        "The UC CCS Cares and Internship 2024 program at the University of Cebu Main Campus was a commendable initiative that combined community service with practical work experience for students. The program aimed to foster a sense of social responsibility among students while providing them with valuable insights into their future careers.",
    },
    {
      id: 2,
      title: "UC Intramurals",
      location: "University of Cebu Main Campus",
      image: UCIntramurals,
      startDateTime: "2024-11-20T00:00:00+08:00",
      endDateTime: "2024-11-20T23:59:59+08:00",
      description:
        "The UC Intramurals at the University of Cebu Main Campus was a lively event that brought together students from various departments to compete in a range of sports and recreational activities. The intramurals fostered camaraderie, sportsmanship, and school spirit among participants and spectators alike.",
    },
    {
      id: 1,
      title: "CCS Acquaintance Party 2024",
      location: "SM Seaside City Cebu",
      image: CCSAcquaintance,
      startDateTime: "2024-11-16T00:00:00+08:00",
      endDateTime: "2024-11-16T23:59:59+08:00",
      description:
        "On November 16, 2024, the CCS Acquaintance Party brought together students, faculty, and alumni at SM Seaside City Cebu for a night inspired by the timeless allure of the Old Money theme. The event was a celebration of camaraderie, elegance, and the rich heritage of the College of Computer Studies (CCS) community.",
    },
  ],
};
// --- Organization Section Data ---
export interface Member {
  name: string;
  role: string;
  image: string;
  socials?: { email?: string; github?: string };
}

export interface OrganizationTab {
  id: string;
  label: string;
  title: string;
  description: string;
  content: string;
  image: string;
  advisors: Member[];
  officers: Member[];
  developers: Member[];
  volunteers: Member[];
}

export interface OrganizationSectionData {
  header: {
    subtitle: string;
    title: {
      normal: string;
      highlight: string;
    };
  };
  tabs: OrganizationTab[];
}

export const organizationSectionData: OrganizationSectionData = {
  header: {
    subtitle: "The heartbeat of digital innovation",
    title: {
      normal: "Our",
      highlight: "Organization",
    },
  },
  tabs: [
    {
      id: "psits",
      label: "PSITS",
      title: "Philippine Society of I.T. Students",
      description:
        "The primary student organization for Information Technology students, focusing on technical excellence and professional development.",
      content:
        "PSITS serves as the umbrella organization for all IT students, providing a platform for growth, collaboration, and innovation through various technical workshops, seminars, and networking events.",
      image: ICT,
      advisors: [
        {
          name: "Engr. Dennis Durano",
          role: "PSITS Adviser",
          image: Dennis,
          socials: { email: "jane@example.com" },
        },
        {
          name: "Jia Nova B. Montecino",
          role: "PSITS Adviser",
          image: Jia,
          socials: { email: "jane@example.com" },
        },
      ],
      officers: [
        {
          name: "Marlou Tadlip",
          role: "President",
          image: Tadlip,
          socials: { email: "jacinth@example.com", github: "jacinth" },
        },
        {
          name: "Clint Louie Tuyor",
          role: "Vice President Internal",
          image: Tuyor,
          socials: { email: "james@example.com", github: "james" },
        },
        {
          name: "Ralph Theodore Alon",
          role: "Vice President External",
          image: Alon,
          socials: { email: "jacinth@example.com", github: "jacinth" },
        },
        // TODO: Add photo for Secretary before uncommenting
        // {
        //   name: "James Doe",
        //   role: "Secretary",
        //   image: Alon,
        //   socials: { email: "james@example.com", github: "james" },
        // },
        {
          name: "Khrysha Español",
          role: "Assistant Treasurer",
          image: Español,
          socials: { email: "jacinth@example.com", github: "jacinth" },
        },
        {
          name: "Raiza Mae Peresores",
          role: "Auditor",
          image: Peresores,
          socials: { email: "james@example.com", github: "james" },
        },
        {
          name: "Daisy Lyn Laygan",
          role: "Treasurer",
          image: Laygan,
          socials: { email: "jacinth@example.com", github: "jacinth" },
        },
        {
          name: "Kisses Peñera",
          role: "Chief Volunteer",
          image: Penera,
          socials: { email: "jacinth@example.com", github: "jacinth" },
        },
        {
          name: "Angela Postrero",
          role: "Public Information Officer",
          image: Postrero,
          socials: { email: "jacinth@example.com", github: "jacinth" },
        },
        {
          name: "Vince Bryant Cabunilas",
          role: "Public Relations Officer",
          image: Cabunilas,
          socials: { email: "jacinth@example.com", github: "jacinth" },
        },
        {
          name: "Jamaica Esgana",
          role: "First Year Representative",
          image: Penera,
          socials: { email: "jacinth@example.com", github: "jacinth" },
        },
        {
          name: "Lee Vincent Laurito",
          role: "Second Year Representative",
          image: Laurito,
          socials: { email: "jacinth@example.com", github: "jacinth" },
        },
        {
          name: "Christ Hanzen Rallos",
          role: "Third Year Representative",
          image: Rallos,
          socials: { email: "jacinth@example.com", github: "jacinth" },
        },
        {
          name: "Princess Villanueva",
          role: "Fourth Year Representative",
          image: Villanueva,
          socials: { email: "jacinth@example.com", github: "jacinth" },
        },
      ],
      developers: [
        {
          name: "Anton James Genabio",
          role: "Former Head Developer",
          image: Genabio,
          socials: { github: "johnsmith" },
        },
        {
          name: "Marriane Joy Napisa",
          role: "Project Manager",
          image: Napisa,
          socials: { github: "johnsmith" },
        },
        {
          name: "Ralph Adriane Dilao",
          role: "Lead Developer",
          image: Dilao,
          socials: { github: "johnsmith" },
        },
        {
          name: "Vince Clave Igot",
          role: "Fullstack Developer",
          image: Igot,
          socials: { github: "johnsmith" },
        },
        {
          name: "Ram Riley Alin",
          role: "Backend Developer",
          image: Alin,
          socials: { github: "johnsmith" },
        },
        {
          name: "Jacinth Cedric Barral",
          role: "Backend Developer",
          image: Barral,
          socials: { github: "johnsmith" },
        },
        {
          name: "Mark Enfermo",
          role: "Backend Developer",
          image: PersonPlaceholder,
          socials: { github: "johnsmith" },
        },
        {
          name: "Jan Lorenz Laroco",
          role: "Frontend Developer",
          image: Laroco,
          socials: { github: "johnsmith" },
        },
        {
          name: "Froilan Kim Edem",
          role: "Fullstack Developer",
          image: PersonPlaceholder,
          socials: { github: "johnsmith" },
        },
        {
          name: "Arvin Albeos",
          role: "Quality Assurance",
          image: Albeos,
          socials: { github: "johnsmith" },
        },
        {
          name: "Luke Harvey Umpad",
          role: "UI/UX Designer",
          image: PersonPlaceholder,
          socials: { github: "johnsmith" },
        },
      ],
      volunteers: [
        {
          name: "Alice Johnson",
          role: "Event Volunteer",
          image: Genabio,
        },
      ],
    },
  ],
};

export const tutorials = {
  firstYear: [
    {
      course: "CC-INTCOM11 Introduction to Computing",
      link: "https://www.scribd.com/document/618644383/Introduction-to-Computing-1st-year-1st-semester",
      image:
        "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQcPLG2rwvp9oN1C4XB4bEikx1h4AJVX6QRxw&s",
    },
    {
      course: "CC-COMPROG11 Computer Programming 1",
      link: "https://www.w3schools.com/c/c_intro.php",
      image:
        "https://w0.peakpx.com/wallpaper/757/901/HD-wallpaper-c-sharp-black-logo-programming-language-grid-metal-background-c-sharp-artwork-creative-programming-language-signs-c-sharp-logo.jpg",
    },
    {
      course: "CC-COMPROG12 Computer Programming 2",
      link: "https://www.w3schools.com/java/java_intro.asp",
      image:
        "https://4kwallpapers.com/images/wallpapers/java-black-2560x2560-16069.png",
    },
    {
      course: "IT-WEBDEV11 Web Design & Development",
      link: "https://www.w3schools.com/whatis/",
      image:
        "https://c8.alamy.com/comp/2C2MXR8/web-development-blue-color-text-on-dark-digital-background-2C2MXR8.jpg",
    },
    {
      course: "CC-DISCRET12 Discrete Structures",
      link: "https://www.csd.uwo.ca/~abrandt5/teaching/DiscreteStructures/intro.html",
      image:
        "https://www.shutterstock.com/image-vector/modern-color-thin-line-concept-600nw-511337065.jpg",
    },
  ],
  secondYear: [
    {
      course: "CC-DIGILOG21 Digital Logic Design",
      link: "https://www.geeksforgeeks.org/digital-electronics-logic-design-tutorials/",
      image:
        "https://as1.ftcdn.net/v2/jpg/01/22/17/08/1000_F_122170865_Cwufk4kjroqCSmWHmoj2BC4Cf0DJgvki.jpg",
    },
    {
      course: "IT-OOPROG21 Object Oriented Programming",
      link: "https://www.w3schools.com/java/java_oop.asp",
      image:
        "https://i.pinimg.com/originals/6e/12/6a/6e126a9ace040280e45f8144cf0cb2c8.jpg",
    },
    {
      course: "IT-PLATECH22 Platform Technologies w/ Op. Sys.",
      link: "https://www.geeksforgeeks.org/computer-organization-and-architecture-tutorials/",
      image:
        "https://w0.peakpx.com/wallpaper/408/520/HD-wallpaper-windows-10-dark-logo-windows-10-computer-dark-logo-black-thumbnail.jpg",
    },
    {
      course: "IT-SAD21 System Analysis & Design",
      link: "https://www.tutorialspoint.com/system_analysis_and_design/system_analysis_and_design_overview.htm",
      image:
        "https://c8.alamy.com/comp/2DCAAG7/analyst-working-with-business-analytics-and-data-management-system-on-computer-to-make-report-with-kpi-and-metrics-connected-to-database-corporate-st-2DCAAG7.jpg",
    },
    {
      course: "CC-APPSDEV22 Applications Dev't & Emerging Tech.",
      link: "https://www.geeksforgeeks.org/introduction-to-c-sharp-windows-forms-applications/",
      image:
        "https://c8.alamy.com/comp/2DC8EXR/asp-net-inscription-against-laptop-and-code-background-learn-dot-net-programming-language-computer-courses-training-2DC8EXR.jpg",
    },
    {
      course: "CC-DASTRUC22 Data Structures & Algorithms",
      link: "https://www.geeksforgeeks.org/data-structures/",
      image:
        "https://img.pikbest.com/ai/illus_our/20230427/8f6e83cf21979200459e5f74cf34c766.jpg!w700wp",
    },
    {
      course: "CC-DATACOM22 Data Communications",
      link: "https://www.cisco.com/c/m/en_sg/partners/cisco-networking-academy/index.html",
      image:
        "https://1000logos.net/wp-content/uploads/2016/11/cisco-symbol.jpg",
    },
  ],
  thirdYear: [
    {
      course: "IT-IMDBSYS31 Information Management (DB Sys.1)",
      link: "https://www.w3schools.com/sql/",
      image: "https://cdn-icons-png.flaticon.com/512/5968/5968306.png",
    },
    {
      course: "IT-IMDBSYS32 Information Management (DB Sys. 2)",
      link: "https://www.mysqltutorial.org/",
      image: "https://cdn-icons-png.flaticon.com/512/5968/5968306.png",
    },
    {
      course: "IT-NETWORK31 Computer Networks",
      link: "https://www.cisco.com/c/m/en_sg/partners/cisco-networking-academy/index.html",
      image:
        "https://1000logos.net/wp-content/uploads/2016/11/cisco-symbol.jpg",
    },
    {
      course: "IT-INFOSEC32 Information Assurance & Security",
      link: "https://picoctf.org",
      image:
        "https://media.istockphoto.com/id/1383553886/pt/vetorial/abstract-banner-cyber-security-in-3d-style-communication-technology-database-system.jpg?s=612x612&w=0&k=20&c=Z8QCU9l9StN9Yc45T4OcCJCr4dCqhq4YIAeCZKl_DIo=",
    },
    {
      course: "IT-TESTQUA31 Testing & Quality Assurance",
      link: "https://www.softwaretestinghelp.com/",
      image:
        "https://us.123rf.com/450wm/dizanna/dizanna2203/dizanna220301177/183888419-qa-quality-assurance-acronym-business-concept-background.jpg",
    },
    {
      course: "IT-SYSARCH32 System Integration & Architecture",
      link: "https://www.slideshare.net/slideshow/chapter-1-introduction-to-system-integration-and-architecturepdf/263057894",
      image:
        "https://png.pngtree.com/png-vector/20220521/ourmid/pngtree-icon-of-system-integration-a-minimalistic-blackandwhite-symbol-for-industry-40-templates-web-design-and-infographics-vector-png-image_46354724.jpg",
    },
    {
      course: "CC-HCI31 Human Computer Interaction",
      link: "https://www.simplilearn.com/what-is-human-computer-interaction-article#:~:text=Human-Computer%20Interaction%20is%20a,friendly%2C%20efficient%2C%20and%20enjoyable.",
      image:
        "https://www.ise.tu-darmstadt.de/media/ise/research_ise/research_topics/Human-Computer_Interaction_Logo2.jpg",
    },
    {
      course: "CC-TECHNO32 Technopreneurship",
      link: "https://www.entrepreneur.com/topic/technopreneurship",
      image:
        "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRrwC759-O-IBokwPKPW862gha-jDGZ3OMQ2g&s",
    },

    {
      course: "IT-INTPROG32 Integrative Prog'g & Technologies",
      link: "https://learn.microsoft.com/en-us/aspnet/mvc/overview/getting-started/introduction/getting-started",
      image:
        "https://cdn.dribbble.com/users/42044/screenshots/3005802/media/18e91928154957a9baf2fcefbbd94f81.jpg?resize=400x300&vertical=center",
    },
  ],
  fourthYear: [
    {
      course: "Hacker Rank",
      link: "https://www.hackerrank.com",
      image:
        "https://upload.wikimedia.org/wikipedia/commons/4/40/HackerRank_Icon-1000px.png",
    },
  ],
};
