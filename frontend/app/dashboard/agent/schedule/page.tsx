'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '../../../../src/stores/authStore';
import { timesheetsService } from '../../../../src/services/api/timesheets';
import { assignmentsService } from '../../../../src/services/api/assignments';
import { useTranslation } from '../../../../src/contexts/I18nContext';

export default function AgentSchedulePage() {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const [weekTimesheets, setWeekTimesheets] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [weekSummary, setWeekSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState(new Date());

  useEffect(() => { loadSchedule(); }, [selectedWeek]);

  const loadSchedule = async () => {
    setIsLoading(true);
    try {
      const [timesheets, assigns] = await Promise.all([
        timesheetsService.getWeek(selectedWeek.toISOString().split('T')[0]),
        assignmentsService.getMyAssignments(),
      ]);
      setWeekTimesheets(timesheets.timesheets || []);
      setWeekSummary(timesheets);
      setAssignments(assigns);
    } catch (error) {
      console.error('Erreur de chargement:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const changeWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedWeek);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    setSelectedWeek(newDate);
  };

  const getWeekDays = () => {
    const days = [];
    const startOfWeek = new Date(selectedWeek);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1);
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(date.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const getTimesheetForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return weekTimesheets.find(ts => ts.date === dateStr);
  };

  const weekDays = getWeekDays();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-600">{t('agent.schedule.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <span className="mr-3">📅</span>
          {t('agent.schedule.title')}
        </h1>
        <p className="text-gray-600 mt-1">{t('agent.schedule.subtitle')}</p>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => changeWeek('prev')}
            className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            {t('agent.schedule.prevWeek')}
          </button>
          <span className="font-medium text-gray-700">
            {weekDays[0].toLocaleDateString('fr-FR')} — {weekDays[6].toLocaleDateString('fr-FR')}
          </span>
          <button
            onClick={() => changeWeek('next')}
            className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            {t('agent.schedule.nextWeek')}
          </button>
        </div>
      </div>

      {weekSummary && (
        <div className="bg-indigo-50 rounded-lg shadow p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-sm text-indigo-600">{t('agent.schedule.totalHours')}</p>
              <p className="text-3xl font-bold text-indigo-800">{weekSummary.totalHours || 0}h</p>
            </div>
            <div>
              <p className="text-sm text-indigo-600">{t('agent.schedule.overtime')}</p>
              <p className="text-3xl font-bold text-indigo-800">
                {weekTimesheets.reduce((sum, ts) => sum + parseFloat(ts.overtimeHours || '0'), 0)}h
              </p>
            </div>
            <div>
              <p className="text-sm text-indigo-600">{t('agent.schedule.nightHours')}</p>
              <p className="text-3xl font-bold text-indigo-800">
                {weekTimesheets.reduce((sum, ts) => sum + parseFloat(ts.nightHours || '0'), 0)}h
              </p>
            </div>
            <div>
              <p className="text-sm text-indigo-600">{t('agent.schedule.sitesAssigned')}</p>
              <p className="text-3xl font-bold text-indigo-800">{assignments.length}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="grid grid-cols-7 border-b">
          {weekDays.map((date, index) => (
            <div key={index} className="p-3 text-center border-r last:border-r-0">
              <p className="text-sm text-gray-500">
                {date.toLocaleDateString('fr-FR', { weekday: 'short' })}
              </p>
              <p className="text-lg font-semibold">{date.getDate()}</p>
            </div>
          ))}
        </div>

        <div className="divide-y">
          {weekDays.map((date, index) => {
            const timesheet = getTimesheetForDate(date);
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;

            return (
              <div key={index} className="grid grid-cols-7">
                <div className="col-span-7 p-4">
                  {isWeekend ? (
                    <div className="text-center py-4 bg-gray-50 rounded-lg">
                      <p className="text-gray-400">😴 {t('agent.schedule.weekend')}</p>
                    </div>
                  ) : timesheet ? (
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{timesheet.site.name}</p>
                          <div className="flex items-center space-x-4 mt-2 flex-wrap gap-y-1">
                            <span className="text-sm text-gray-600">
                              🕐 {t('agent.schedule.hoursWorked', { h: timesheet.hoursWorked })}
                            </span>
                            {parseFloat(timesheet.overtimeHours) > 0 && (
                              <span className="text-sm text-orange-600">
                                ⏰ {t('agent.schedule.overtimeHours', { h: timesheet.overtimeHours })}
                              </span>
                            )}
                            {timesheet.breakMinutes > 0 && (
                              <span className="text-sm text-gray-600">
                                🍽️ {t('agent.schedule.breakMinutes', { m: timesheet.breakMinutes })}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs ${
                          timesheet.status === 'VALIDATED' ? 'bg-green-100 text-green-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {timesheet.status === 'VALIDATED'
                            ? `✅ ${t('agent.schedule.validated')}`
                            : `⏳ ${t('agent.schedule.waitingValidation')}`}
                        </span>
                      </div>
                      {timesheet.notes && (
                        <p className="text-sm text-gray-500 mt-2">📝 {timesheet.notes}</p>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4 bg-gray-50 rounded-lg">
                      <p className="text-gray-400">{t('agent.schedule.noPlan')}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">📍 {t('agent.schedule.mySites')}</h2>
        <div className="space-y-3">
          {assignments.length > 0 ? (
            assignments.map((assignment) => (
              <div key={assignment.id} className="p-4 bg-gray-50 rounded-lg">
                <p className="font-medium">{assignment.site.name}</p>
                <p className="text-sm text-gray-500">{assignment.site.address}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {t('agent.schedule.since', { date: new Date(assignment.startDate).toLocaleDateString('fr-FR') })}
                </p>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-4">{t('agent.schedule.noSite')}</p>
          )}
        </div>
      </div>
    </div>
  );
}
