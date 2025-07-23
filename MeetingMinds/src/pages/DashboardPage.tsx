import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Calendar, Clock, MoreVertical, RefreshCw } from 'lucide-react';
import Navigation from '../components/Navigation';
import AgentSelectionModal from '../components/AgentSelectionModal';
import LoadingSpinner from '../components/LoadingSpinner';
import { Meeting } from '../types';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { formatDate } from '../utils/dateUtils';
import { LOADING_MESSAGES } from '../constants';

const DashboardPage: React.FC = () => {
  const { user, getFirefliesApiKey } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMeetings, setIsLoadingMeetings] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMeetings = async () => {
    if (!user) {
      setError('User not authenticated');
      return;
    }

    try {
      setIsLoadingMeetings(true);
      setError(null);
      
      // Get the Fireflies API key for the current user
      const apiKey = await getFirefliesApiKey();
      
      if (!apiKey) {
        setError('Fireflies API key not found. Please check your settings.');
        return;
      }

      console.log('🔑 Using API key for query:', apiKey);

      // Query Supabase for transcripts using the API key
      const { data, error: supabaseError } = await supabase
        .from('Transcripts')
        .select('*')
        .eq('UUID', apiKey);

      if (supabaseError) {
        console.error('❌ Supabase query error:', supabaseError);
        setError(`Failed to fetch meetings: ${supabaseError.message}`);
        return;
      }

      console.log('📊 Supabase response:', data);

      if (!data || data.length === 0) {
        console.log('⚠️ No data found for API key');
        setMeetings([]);
        return;
      }

      // Extract transcripts from the response
      const transcriptsData = data[0]?.Transcripts;
      
      if (!transcriptsData || !Array.isArray(transcriptsData)) {
        console.log('⚠️ No transcripts found in response');
        setMeetings([]);
        return;
      }

      // Transform the transcripts data to match our Meeting interface
      const transformedMeetings: Meeting[] = transcriptsData.map((transcript: any) => ({
        id: transcript.id,
        title: transcript.title,
        date: new Date(transcript.date).toISOString().split('T')[0], // Format as YYYY-MM-DD
        duration: 'N/A' // Duration not provided in the API response
      }));

      console.log('✅ Transformed meetings:', transformedMeetings);
      setMeetings(transformedMeetings);

    } catch (err) {
      console.error('❌ Error loading meetings:', err);
      setError('An unexpected error occurred while loading meetings');
    } finally {
      setIsLoadingMeetings(false);
    }
  };

  const handleAnalyze = (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    setShowAgentModal(true);
  };

  const filteredMeetings = meetings.filter(meeting =>
    meeting.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="pt-28 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-2xl font-medium text-gray-800 mb-2">Your Meetings</h2>
            <div className="flex items-center justify-between">
              <p className="text-gray-600">Analyze your recorded meetings with AI-powered agents</p>
              <motion.button
                onClick={loadMeetings}
                disabled={isLoadingMeetings}
                className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                whileHover={{ scale: isLoadingMeetings ? 1 : 1.02 }}
                whileTap={{ scale: isLoadingMeetings ? 1 : 0.98 }}
              >
                {isLoadingMeetings ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Loading...</span>
                  </>
                ) : (
                  <span>Load meetings</span>
                )}
              </motion.button>
            </div>
          </motion.div>

          {/* Error Message */}
          {error && (
            <motion.div
              className="mb-8 p-4 bg-red-50 border border-red-200 rounded-xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.6 }}
            >
              <p className="text-red-700 text-sm">{error}</p>
            </motion.div>
          )}

          {/* Search Bar - Only show if we have meetings */}
          {meetings.length > 0 && (
            <motion.div
              className="mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search meetings..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </motion.div>
          )}

          {/* Meetings Table - Only show if we have meetings */}
          {meetings.length > 0 && (
            <motion.div
              className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">Meeting Title</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">Date</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">Duration</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredMeetings.map((meeting, index) => (
                      <motion.tr
                        key={meeting.id}
                        className="hover:bg-gray-50 transition-colors"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 + index * 0.1, duration: 0.5 }}
                      >
                        <td className="px-6 py-4">
                          <div className="font-semibold text-gray-900">{meeting.title}</div>
                          <div className="text-sm text-gray-500">ID: {meeting.id}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2 text-gray-700">
                            <Calendar className="w-4 h-4" />
                            <span>{formatDate(meeting.date)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2 text-gray-700">
                            <Clock className="w-4 h-4" />
                            <span>{meeting.duration}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <motion.button
                              onClick={() => handleAnalyze(meeting)}
                              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              🔍 Analyze
                            </motion.button>
                            <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredMeetings.length === 0 && meetings.length > 0 && (
                <div className="p-12 text-center">
                  <div className="text-gray-400 mb-4">
                    <Search className="w-12 h-12 mx-auto" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No meetings found</h3>
                  <p className="text-gray-600">Try adjusting your search terms</p>
                </div>
              )}
            </motion.div>
          )}

          {/* Empty State - Show when no meetings loaded yet */}
          {meetings.length === 0 && !isLoadingMeetings && !error && (
            <motion.div
              className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              <div className="text-gray-400 mb-4">
                <Calendar className="w-12 h-12 mx-auto" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No meetings loaded</h3>
              <p className="text-gray-600">Click "Load meetings" to fetch your meeting transcripts from Fireflies</p>
            </motion.div>
          )}
        </div>
      </main>

      {/* Agent Selection Modal */}
      <AgentSelectionModal
        isOpen={showAgentModal}
        onClose={() => setShowAgentModal(false)}
        meeting={selectedMeeting}
      />
    </div>
  );
};

export default DashboardPage;