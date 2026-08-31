import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EmailTrackerSidebar } from './EmailTrackerSidebar';
import { EmailTrackerHeader } from './EmailTrackerHeader';
import { EmailTrackerOverview } from './EmailTrackerOverview';
import { EmailTrackerEmployees } from './EmailTrackerEmployees';
import { EmailTrackerEmployeeDetail } from './EmailTrackerEmployeeDetail';
import { EmailTrackerSettings } from './EmailTrackerSettings';

export type ActiveView = 'overview' | 'employees' | 'employee-detail' | 'settings';

export function EmailTrackerDashboard() {
  const [activeView, setActiveView] = useState<ActiveView>('overview');
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    // Check localStorage for theme preference
    const savedTheme = localStorage.getItem('email-tracker-theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    if (!isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('email-tracker-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('email-tracker-theme', 'light');
    }
  };

  const handleEmployeeSelect = (email: string) => {
    setSelectedEmployee(email);
    setActiveView('employee-detail');
  };

  const handleBackToEmployees = () => {
    setSelectedEmployee(null);
    setActiveView('employees');
  };

  return (
    <div className={`min-h-screen flex bg-background transition-colors duration-300`}>
      <EmailTrackerSidebar
        activeView={activeView}
        setActiveView={setActiveView}
        isCollapsed={isSidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
      />
      
      <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
        <EmailTrackerHeader
          isDarkMode={isDarkMode}
          toggleTheme={toggleTheme}
          activeView={activeView}
          selectedEmployee={selectedEmployee}
          onBack={handleBackToEmployees}
        />
        
        <main className="flex-1 p-6 overflow-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView + (selectedEmployee || '')}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              {activeView === 'overview' && <EmailTrackerOverview />}
              {activeView === 'employees' && (
                <EmailTrackerEmployees onEmployeeSelect={handleEmployeeSelect} />
              )}
              {activeView === 'employee-detail' && selectedEmployee && (
                <EmailTrackerEmployeeDetail email={selectedEmployee} onBack={handleBackToEmployees} />
              )}
              {activeView === 'settings' && <EmailTrackerSettings />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}