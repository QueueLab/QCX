'use client'

import { driver } from "driver.js"
import "driver.js/dist/driver.css"

export const useOnboardingTour = () => {
  const startTour = (isMobile: boolean) => {
    const desktopSteps = [
      {
        element: '[data-testid="chat-input"]',
        popover: {
          title: 'Chat Explorer',
          description: 'Ask questions about any location, upload images for analysis, or request geospatial data. Try "Show me parks in London".',
          side: "right",
          align: 'start'
        }
      },
      {
        element: '[data-testid="mapbox-container"]',
        popover: {
          title: 'Interactive Map',
          description: 'Visualize your results here. You can pan, zoom, and interact with geocoded markers generated from your chat.',
          side: "left",
          align: 'start'
        }
      },
      {
        element: '[data-testid="logo-history-toggle"]',
        popover: {
          title: 'History & Navigation',
          description: 'Click the QCX logo to toggle your chat history and quickly jump back to previous explorations.',
          side: "bottom",
          align: 'end'
        }
      },
      {
        element: '[data-testid="map-toggle"]',
        popover: {
          title: 'Map Modes',
          description: 'Switch between Live updates, My Maps, or use Drawing Mode to measure areas and distances directly on the map.',
          side: "bottom",
          align: 'start'
        }
      },
      {
        element: '[data-testid="calendar-toggle"]',
        popover: {
          title: 'Calendar & Notes',
          description: 'Keep track of your findings with the built-in notepad. Notes can be geocoded and saved to specific dates.',
          side: "bottom",
          align: 'start'
        }
      },
      {
        element: '[data-testid="resolution-search"]',
        popover: {
          title: 'Resolution Search',
          description: 'Perform deep satellite analysis of your current map view. This captures high-resolution imagery for detailed inspection.',
          side: "bottom",
          align: 'start'
        }
      },
      {
        element: '[data-testid="usage-toggle"]',
        popover: {
          title: 'Usage & Credits',
          description: 'Monitor your compute usage and manage your credits. You can upgrade your plan here to access advanced features.',
          side: "bottom",
          align: 'start'
        }
      },
      {
        element: '[data-testid="profile-toggle"]',
        popover: {
          title: 'User Profile',
          description: 'Manage your account settings, appearance preferences, and security options.',
          side: "bottom",
          align: 'start'
        }
      },
      {
        popover: {
          title: 'All Set!',
          description: 'You are ready to explore the planet with QCX. Click the "?" help icon in the header anytime to restart this tour.'
        }
      }
    ];

    const mobileSteps = [
      {
        element: '[data-testid="chat-input"]',
        popover: {
          title: 'Chat',
          description: 'Type your queries here to start exploring.',
          side: "top",
          align: 'start'
        }
      },
      {
        element: '.mobile-map-section',
        popover: {
          title: 'Map View',
          description: 'Visual results and data will appear in this section.',
          side: "bottom",
          align: 'start'
        }
      },
      {
        element: '[data-testid="mobile-new-chat-button"]',
        popover: {
          title: 'New Chat',
          description: 'Clear the current session and start a fresh exploration.',
          side: "top",
          align: 'start'
        }
      },
      {
        element: '[data-testid="map-toggle"]',
        popover: {
          title: 'Map Controls',
          description: 'Change map layers or enter drawing mode.',
          side: "top",
          align: 'start'
        }
      },
      {
        element: '[data-testid="mobile-calendar-button"]',
        popover: {
          title: 'Notes',
          description: 'Access your calendar and geocoded notes.',
          side: "top",
          align: 'start'
        }
      },
      {
        element: '[data-testid="mobile-search-button"]',
        popover: {
          title: 'Resolution Search',
          description: 'Analyze the current map view with high-res satellite data.',
          side: "top",
          align: 'start'
        }
      },
      {
        element: '[data-testid="mobile-attachment-button"]',
        popover: {
          title: 'Attachments',
          description: 'Upload images or files to analyze.',
          side: "top",
          align: 'start'
        }
      },
      {
        element: '[data-testid="mobile-submit-button"]',
        popover: {
          title: 'Send',
          description: 'Submit your query to the AI.',
          side: "top",
          align: 'start'
        }
      },
      {
        element: '[data-testid="mobile-usage-button"]',
        popover: {
          title: 'Usage',
          description: 'Check your credits and usage statistics.',
          side: "top",
          align: 'start'
        }
      },
      {
        element: '[data-testid="mobile-help-tour"]',
        popover: {
          title: 'Help',
          description: 'Restart this tour anytime by clicking the "?" icon.',
          side: "top",
          align: 'start'
        }
      },
      {
        popover: {
          title: 'Welcome to QCX',
          description: 'Enjoy exploring! You can find the tour again in the bottom bar.'
        }
      }
    ];

    const driverObj = driver({
      showProgress: true,
      animate: true,
      steps: isMobile ? mobileSteps : desktopSteps,
      onDestroyStarted: () => {
        localStorage.setItem('qcx_onboarding_v1', 'true');
        driverObj.destroy();
      }
    });

    driverObj.drive();
  };

  return { startTour };
};
