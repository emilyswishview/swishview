import React from "react";

const teamMembers = [
  { name: "Aman", role: "Head of Operations", image: "/team/aman.jpg" },
  { name: "Sophie", role: "Senior SEO Expert", image: "/team/sophie.jpg" },
  { name: "Daisy", role: "SEO Expert", image: "/team/daisy.jpg" },
  { name: "Ashley", role: "Growth Partner", image: "/team/ashley.jpg" },
  { name: "Emily", role: "Business Manager", image: "/team/emily.jpg" },
  { name: "Manny", role: "Customer Success Manager", image: "/team/manny.jpg" },
];

const TeamSection = () => (
  <section className="py-16 sm:py-24 bg-gray-50">
    <div className="section-container text-center">
      <h2 className="text-3xl sm:text-4xl font-display font-bold text-gray-900 mb-12">
        Our Team
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-8">
        {teamMembers.map((member) => (
          <div
            key={member.name}
            className="flex flex-col items-center space-y-2 bg-white p-6 rounded-2xl shadow-sm hover:shadow-lg transition"
          >
            <div className="w-24 h-24 rounded-full border-2 border-gray-200 overflow-hidden">
              <img
                src={member.image}
                alt={member.name}
                className="w-full h-full object-cover"
              />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">{member.name}</h3>
            <p className="text-sm text-gray-600">{member.role}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default TeamSection;
