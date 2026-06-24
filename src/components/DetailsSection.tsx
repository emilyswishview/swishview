import React, { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { QRCodeSVG } from "qrcode.react";

const DetailsSection = () => {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    subject: "",
    message: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.fullName || !formData.email || !formData.message) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const { error } = await supabase.from("contact_messages").insert([
        {
          full_name: formData.fullName,
          email: formData.email,
          subject: formData.subject,
          message: formData.message,
        },
      ]);

      if (error) throw error;

      toast.success("Message submitted successfully!");

      setFormData({
        fullName: "",
        email: "",
        subject: "",
        message: "",
      });
    } catch (error) {
      console.error("Error submitting contact form:", error);
      toast.error("Error sending message. Please try again later.");
    }
  };

  return (
    <>
      <section id="details" className="w-full bg-white py-0">
        <div className="container px-4 sm:px-6 lg:px-8 mx-auto">
          <div className="grid grid-cols-1 gap-6 md:gap-8 lg:grid-cols-2">
            {/* Contact Info */}
            <div className="rounded-2xl sm:rounded-3xl overflow-hidden shadow-elegant">
              <div
                className="relative h-48 sm:h-64 p-6 sm:p-8 flex items-end"
                style={{
                  backgroundImage: "url('/background-section3.png')",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                <h2 className="text-2xl sm:text-3xl font-display text-white font-bold">
                  Contact Information
                </h2>
              </div>

              <div
                className="bg-white p-4 sm:p-8"
                style={{
                  backgroundColor: "#FFFFFF",
                }}
              >
                <h3 className="text-lg sm:text-xl font-display mb-6 sm:mb-8">
                  We're here to help grow your YouTube channel
                </h3>

                <div className="space-y-4 sm:space-y-6">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-dark-900 flex items-center justify-center mt-1 flex-shrink-0">
                      <svg
                        width="14"
                        height="10"
                        viewBox="0 0 14 10"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M1 5L5 9L13 1"
                          stroke="white"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="p-3 rounded-lg bg-gray-50/80 backdrop-blur-sm border border-gray-100">
                        <span className="font-semibold text-base">Email:</span>{" "}
                        support@swishview.com
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-dark-900 flex items-center justify-center mt-1 flex-shrink-0">
                      <svg width="14" height="10" viewBox="0 0 14 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 5L5 9L13 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="p-3 rounded-lg bg-gray-50/80 backdrop-blur-sm border border-gray-100">
                        <span className="font-semibold text-base">Phone:</span>{" "}
                        <a href="tel:+17056140340" className="text-gray-900 font-medium hover:underline">+1 (705) 614-0340</a>
                      </div>
                    </div>
                  </div>

                  {/* WhatsApp QR Code */}
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-dark-900 flex items-center justify-center mt-1 flex-shrink-0">
                      <svg width="14" height="10" viewBox="0 0 14 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 5L5 9L13 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="p-4 rounded-lg bg-gray-50/80 backdrop-blur-sm border border-gray-100">
                        <span className="font-semibold text-base block mb-3">Scan to Chat on WhatsApp:</span>
                        <div className="flex items-center gap-4">
                          <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-200 inline-block">
                            <QRCodeSVG
                              value="https://wa.me/17056140340"
                              size={120}
                              level="H"
                              imageSettings={{
                                src: "/lovable-uploads/c66edb9b-3295-47cd-be47-4d81e262a4ff.png",
                                height: 28,
                                width: 28,
                                excavate: true,
                              }}
                            />
                          </div>
                          <div className="text-sm text-gray-600">
                            <p className="font-medium text-gray-800 mb-1">Chat with SwishView</p>
                            <p>Scan this QR code with your phone camera to start a WhatsApp conversation.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-dark-900 flex items-center justify-center mt-1 flex-shrink-0">
                      <svg width="14" height="10" viewBox="0 0 14 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 5L5 9L13 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="p-3 rounded-lg bg-gray-50/80 backdrop-blur-sm border border-gray-100">
                        <span className="font-semibold text-base">
                          Support Hours:
                        </span>{" "}
                        24/7 Availability
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-dark-900 flex items-center justify-center mt-1 flex-shrink-0">
                      <svg
                        width="14"
                        height="10"
                        viewBox="0 0 14 10"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M1 5L5 9L13 1"
                          stroke="white"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="p-3 rounded-lg bg-gray-50/80 backdrop-blur-sm border border-gray-100">
                        <span className="font-semibold text-base">
                          Location:
                        </span>{" "}
                        30 N Gould St Ste R Sheridan, WY 82801 United States
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="rounded-2xl sm:rounded-3xl overflow-hidden shadow-elegant">
              <div
                className="relative h-48 sm:h-64 p-6 sm:p-8 flex flex-col items-start"
                style={{
                  backgroundImage: "url('/background-section1.png')",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                <div className="inline-block px-4 sm:px-6 py-2 border border-white text-white rounded-full text-xs mb-4">
                  Contact Us
                </div>
                <h2 className="text-2xl sm:text-3xl font-display text-white font-bold mt-auto">
                  Send us a message
                </h2>
              </div>

              <div
                className="bg-white p-4 sm:p-8"
                style={{
                  backgroundColor: "#FFFFFF",
                }}
              >
                <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                  <div>
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      placeholder="Full name"
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-pulse-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="Email address"
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-pulse-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <input
                      type="text"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      placeholder="Subject"
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-pulse-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      placeholder="Message"
                      rows={4}
                      className="w-full px-4 py-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-pulse-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <button
                      type="submit"
                      className="w-full px-6 py-3 bg-pulse-500 hover:bg-pulse-600 text-white font-medium rounded-full transition-colors duration-300"
                    >
                      Send Message
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* New Section */}
      <GrowWithUsSection />
    </>
  );
};

const GrowWithUsSection = () => {
  return (
    <section className="w-full bg-gray-50 py-16 sm:py-24">
      <div className="container px-4 sm:px-6 lg:px-8 mx-auto text-center max-w-2xl">
        <h2 className="text-3xl sm:text-4xl font-display font-bold text-gray-900 mb-6">
          Grow With Us at SwishView
        </h2>
        <p className="text-lg text-gray-700 mb-8">
          SwishView is growing fast, and we’re looking for passionate people to
          join our team. If you love helping creators succeed, we’d love to hear
          from you.
        </p>
        <p className="text-lg text-gray-800">
          Write to us at{" "}
          <a
            href="mailto:growth@swishview.com"
            className="text-pulse-600 hover:text-pulse-500 font-medium"
          >
            growth@swishview.com
          </a>
        </p>
      </div>
    </section>
  );
};

export default DetailsSection;
