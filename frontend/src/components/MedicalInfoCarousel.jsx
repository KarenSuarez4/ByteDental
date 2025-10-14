import React, { useRef, useState, useEffect } from 'react';
import {
    FaChevronLeft,
    FaChevronRight,
    FaSyringe,
    FaLungs,
    FaPills,
    FaUserMd,
    FaExclamationTriangle,
    FaTint
} from 'react-icons/fa';
import { FaStethoscope } from "react-icons/fa6";
import InfoCard from './InfoCard';

/**
 * MedicalInfoCarousel Component
 * 
 * Displays patient medical history information in a horizontally scrollable carousel format.
 * Features include navigation buttons, responsive design, and accessibility support.
 * 
 * @param {Object} props - Component props
 * @param {Object} props.medicalHistory - Patient's medical history data
 * @param {string} props.doctorSignature - Doctor's signature for the medical record
 * @returns {JSX.Element} Medical information carousel component
 */
const MedicalInfoCarousel = ({ medicalHistory, doctorSignature }) => {
    const carouselRef = useRef(null);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isAtStart, setIsAtStart] = useState(true);
    const [isAtEnd, setIsAtEnd] = useState(false);

    /**
     * Handle carousel scroll in specified direction
     * @param {string} direction - Scroll direction ('left' or 'right')
     */
    const scrollCarousel = (direction) => {
        const carousel = carouselRef.current;

        // Ajustar scrollAmount basado en el ancho de las tarjetas + gap
        let scrollAmount;

        if (window.innerWidth >= 1024) {
            // Desktop: w-60 (240px) + gap-6 (24px) = 264px
            // Para scrollear 2 tarjetas: 264 * 2 = 528px
            scrollAmount = 528;
        } else if (window.innerWidth >= 640) {
            // Tablet: w-64 (256px) + gap-4 (16px) = 272px
            // Para scrollear 2 tarjetas: 272 * 2 = 544px
            scrollAmount = 544;
        } else {
            // Mobile: w-56 (224px) + gap-3 (12px) = 236px
            // Para scrollear 1 tarjeta: 236px
            scrollAmount = 236;
        }

        if (carousel) {
            const newScrollLeft = direction === 'left'
                ? carousel.scrollLeft - scrollAmount
                : carousel.scrollLeft + scrollAmount;

            carousel.scrollTo({
                left: newScrollLeft,
                behavior: 'smooth'
            });
        }
    };

    /**
     * Handle keyboard navigation for accessibility
     * @param {KeyboardEvent} event - Keyboard event
     * @param {string} direction - Navigation direction
     */
    const handleKeyPress = (event, direction) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            scrollCarousel(direction);
        }
    };

    /**
     * Update navigation button states based on scroll position
     */
    const updateScrollState = () => {
        const carousel = carouselRef.current;
        if (carousel) {
            setIsAtStart(carousel.scrollLeft <= 0);
            setIsAtEnd(
                carousel.scrollLeft >= carousel.scrollWidth - carousel.clientWidth - 1
            );
        }
    };

    // Monitor scroll position for navigation state
    useEffect(() => {
        const carousel = carouselRef.current;
        if (carousel) {
            carousel.addEventListener('scroll', updateScrollState);
            updateScrollState(); // Initial state check

            return () => {
                carousel.removeEventListener('scroll', updateScrollState);
            };
        }
    }, []);

    // Medical information cards configuration with pastel blue theme
    const medicalCards = [
        {
            title: "Patologías Generales",
            icon: <FaStethoscope />,
            bgColor: "bg-blue-50 border border-blue-200",
            iconColor: "text-blue-500",
            content: medicalHistory?.general_pathologies || "No especificado",
            ariaLabel: "Información sobre patologías generales"
        },
        {
            title: "Tolerancia a Anestesia",
            icon: <FaSyringe />,
            bgColor: "bg-cyan-50 border border-cyan-200",
            iconColor: "text-cyan-500",
            content: medicalHistory?.anesthesia_tolerance || "No especificado",
            ariaLabel: "Información sobre tolerancia a anestesia"
        },
        {
            title: "Condición Respiratoria",
            icon: <FaLungs />,
            bgColor: "bg-sky-50 border border-sky-200",
            iconColor: "text-sky-500",
            content: medicalHistory?.breathing_condition || "No especificado",
            ariaLabel: "Información sobre condición respiratoria"
        },
        {
            title: "Medicamentos Actuales",
            icon: <FaPills />,
            bgColor: "bg-indigo-50 border border-indigo-200",
            iconColor: "text-indigo-500",
            content: medicalHistory?.current_medication || "No especificado",
            ariaLabel: "Información sobre medicamentos actuales"
        },
        {
            title: "Tratamientos Previos",
            icon: <FaUserMd />,
            bgColor: "bg-slate-50 border border-slate-200",
            iconColor: "text-slate-500",
            content: medicalHistory?.previous_treatments || "No especificado",
            ariaLabel: "Información sobre tratamientos previos"
        },
        {
            title: "Alergias",
            icon: <FaExclamationTriangle />,
            bgColor: "bg-rose-50 border border-rose-200",
            iconColor: "text-rose-500",
            content: medicalHistory?.allergies || "No especificado",
            ariaLabel: "Información sobre alergias"
        },
        {
            title: "Condición de Coagulación",
            icon: <FaTint />,
            bgColor: "bg-teal-50 border border-teal-200",
            iconColor: "text-teal-500",
            content: medicalHistory?.coagulation_condition || "No especificado",
            ariaLabel: "Información sobre condición de coagulación"
        },
    ];

    const totalSlides = Math.ceil(medicalCards.length / 3);

    return (
        <section
            className="bg-white rounded-lg shadow-md p-4 sm:p-6 min-h-[300px] lg:min-h-[200px]"
            role="region"
            aria-labelledby="medical-info-title"
        >
            {/* Header with title and navigation controls */}
            <header className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-4">
                <h2
                    id="medical-info-title"
                    className="text-lg sm:text-xl font-semibold text-primary-blue-hover font-poppins"
                >
                    Información Médica Completa
                </h2>

                {/* Navigation controls */}
                <nav
                    className="flex gap-2 justify-center sm:justify-end"
                    role="navigation"
                    aria-label="Navegación del carrusel de información médica"
                >
                    <button
                        onClick={() => scrollCarousel('left')}
                        onKeyDown={(e) => handleKeyPress(e, 'left')}
                        disabled={isAtStart}
                        className={`
                            p-2 sm:p-3 rounded-full text-white transition-all duration-200 shadow-md
                            focus:outline-none focus:ring-2 focus:ring--primary-blue focus:ring-offset-2
                            ${isAtStart
                                ? 'bg-gray-400 cursor-not-allowed opacity-50'
                                : 'bg-primary-blue hover:bg-primary-blue-hover active:scale-95'
                            }
                        `}
                        aria-label="Tarjetas de información médica anteriores"
                        aria-disabled={isAtStart}
                    >
                        <FaChevronLeft className="text-sm sm:text-base" aria-hidden="true" />
                    </button>
                    <button
                        onClick={() => scrollCarousel('right')}
                        onKeyDown={(e) => handleKeyPress(e, 'right')}
                        disabled={isAtEnd}
                        className={`
                            p-2 sm:p-3 rounded-full text-white transition-all duration-200 shadow-md
                            focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-2
                            ${isAtEnd
                                ? 'bg-gray-400 cursor-not-allowed opacity-50'
                                : 'bg-primary-blue hover:bg-primary-blue-hover active:scale-95'
                            }
                        `}
                        aria-label="Siguientes tarjetas de información médica"
                        aria-disabled={isAtEnd}
                    >
                        <FaChevronRight className="text-sm sm:text-base" aria-hidden="true" />
                    </button>
                </nav>
            </header>

            {/* Carousel container with responsive height */}
            <div className="relative h-32 sm:h-40 lg:h-48">
                {/* Scrollable cards container */}
                <div
                    ref={carouselRef}
                    className="flex gap-3 sm:gap-4 lg:gap-6 overflow-x-auto scrollbar-hide scroll-smooth py-2 sm:py-4 h-full"
                    style={{
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none',
                    }}
                    role="tabpanel"
                    aria-live="polite"
                    aria-label="Tarjetas de información médica"
                >
                    {medicalCards.map((card, index) => (
                        <article
                            key={`medical-card-${index}`}
                            className="flex-shrink-0 w-56 h-28 sm:w-64 sm:h-36 lg:w-60 lg:h-40 "
                            role="article"
                            aria-labelledby={`card-title-${index}`}
                        >
                            <InfoCard
                                title={card.title}
                                icon={card.icon}
                                bgColor={card.bgColor}
                                iconColor={card.iconColor}
                                content={card.content}
                                className="h-full w-full transition-transform duration-200 hover:scale-105 hover:z-10 focus-within:scale-105 focus-within:z-10"
                                aria-label={card.ariaLabel}
                                titleId={`card-title-${index}`}
                            />
                        </article>
                    ))}
                </div>

                {/* Visual gradient overlays for scroll indication */}
                {/* <div
                    className="absolute top-0 right-0 w-6 sm:w-8 lg:w-12 h-full bg-gradient-to-l from-white to-transparent pointer-events-none"
                    aria-hidden="true"
                ></div>
                <div
                    className="absolute top-0 left-0 w-6 sm:w-8 lg:w-12 h-full bg-gradient-to-r from-white to-transparent pointer-events-none"
                    aria-hidden="true"
                ></div> */}
            </div>

            {/* Pagination indicators */}
            {totalSlides > 1 && (
                <nav
                    className="flex justify-center mt-4 sm:mt-6 gap-1 sm:gap-2"
                    role="tablist"
                    aria-label="Paginación del carrusel"
                >
                    {Array.from({ length: totalSlides }).map((_, index) => (
                        <button
                            key={`indicator-${index}`}
                            className={`
                                w-2 h-2 sm:w-3 sm:h-3 rounded-full transition-all duration-200
                                focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-1
                                ${currentSlide === index
                                    ? 'bg-primary-blue scale-110'
                                    : 'bg-gray-300 hover:bg-gray-400'
                                }
                            `}
                            onClick={() => {
                                // Calcular la posición basada en las nuevas dimensiones
                                let cardWidth, gap, cardsPerPage;

                                if (window.innerWidth >= 1024) {
                                    cardWidth = 240; // w-60
                                    gap = 24; // gap-6
                                    cardsPerPage = 3;
                                } else if (window.innerWidth >= 640) {
                                    cardWidth = 256; // w-64
                                    gap = 16; // gap-4
                                    cardsPerPage = 2;
                                } else {
                                    cardWidth = 224; // w-56
                                    gap = 12; // gap-3
                                    cardsPerPage = 1;
                                }

                                const scrollPosition = index * cardsPerPage * (cardWidth + gap);
                                carouselRef.current?.scrollTo({
                                    left: scrollPosition,
                                    behavior: 'smooth'
                                });
                                setCurrentSlide(index);
                            }}
                            aria-label={`Ir a la diapositiva ${index + 1} de ${totalSlides}`}
                            role="tab"
                            aria-selected={currentSlide === index}
                        />
                    ))}
                </nav>
            )}

            {/* Screen reader only description */}
            <div className="sr-only">
                <p>
                    Carrusel de información médica que contiene {medicalCards.length} tarjetas.
                    Use los botones anterior y siguiente para navegar a través de los datos del historial médico.
                </p>
            </div>
        </section>
    );
};

export default MedicalInfoCarousel;