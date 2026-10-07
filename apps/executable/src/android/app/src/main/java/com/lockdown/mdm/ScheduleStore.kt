package com.lockdown.mdm

import android.content.Context
import java.util.Calendar

/**
 * Persists per-package access windows (e.g. "only usable 15:00-18:00", optionally restricted to
 * certain days of the week, e.g. weekends only). Stored as
 * "startMinuteOfDay-endMinuteOfDay-daysCsv" strings keyed by package name, where daysCsv is a
 * comma-separated list of Calendar.DAY_OF_WEEK values (1=Sunday..7=Saturday). Older entries
 * written before day-of-week support existed have no third field and default to every day.
 */
object ScheduleStore {
    private const val PREFS = "lockdown_schedules"

    val ALL_DAYS = setOf(
        Calendar.SUNDAY, Calendar.MONDAY, Calendar.TUESDAY, Calendar.WEDNESDAY,
        Calendar.THURSDAY, Calendar.FRIDAY, Calendar.SATURDAY
    )
    private val WEEKEND_DAYS = setOf(Calendar.SATURDAY, Calendar.SUNDAY)
    private val WEEKDAY_DAYS = setOf(
        Calendar.MONDAY, Calendar.TUESDAY, Calendar.WEDNESDAY, Calendar.THURSDAY, Calendar.FRIDAY
    )
    private val DAY_ABBREVIATIONS = mapOf(
        "sun" to Calendar.SUNDAY, "mon" to Calendar.MONDAY, "tue" to Calendar.TUESDAY,
        "wed" to Calendar.WEDNESDAY, "thu" to Calendar.THURSDAY, "fri" to Calendar.FRIDAY,
        "sat" to Calendar.SATURDAY
    )
    private val DAY_LABELS = DAY_ABBREVIATIONS.entries.associate { (label, day) -> day to label }

    data class Window(val startMinute: Int, val endMinute: Int, val days: Set<Int> = ALL_DAYS) {
        /**
         * Supports overnight windows (e.g. 22:00-02:00) via wraparound, and treats an
         * equal start/end (e.g. 00:00-00:00) as "all day" since HH:MM can't otherwise express
         * a full 24h span.
         */
        fun contains(nowMinute: Int, dayOfWeek: Int): Boolean {
            if (dayOfWeek !in days) return false
            if (startMinute == endMinute) return true
            return if (startMinute <= endMinute) nowMinute in startMinute until endMinute
            else nowMinute >= startMinute || nowMinute < endMinute
        }

        override fun toString(): String {
            val timePart = if (startMinute == endMinute) "all day"
                else "%02d:%02d-%02d:%02d".format(startMinute / 60, startMinute % 60, endMinute / 60, endMinute % 60)
            if (days == ALL_DAYS) return timePart
            val daysPart = days.sorted().joinToString(",") { DAY_LABELS[it] ?: it.toString() }
            return "$timePart ($daysPart)"
        }
    }

    private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun setSchedule(context: Context, packageName: String, window: Window) {
        // Serialized using the same 3-letter abbreviations parseDays() understands (not raw
        // Calendar ints) so allSchedules() can deserialize it with that same parser - storing
        // ints here previously made every persisted day-of-week get silently discarded back to
        // "every day" on the next load, since parseDays() only recognizes abbreviations/keywords.
        val daysCsv = window.days.sorted().joinToString(",") { DAY_LABELS[it] ?: it.toString() }
        prefs(context).edit()
            .putString(packageName, "${window.startMinute}-${window.endMinute}-$daysCsv")
            .apply()
    }

    fun clearSchedule(context: Context, packageName: String) {
        prefs(context).edit().remove(packageName).apply()
    }

    fun allSchedules(context: Context): Map<String, Window> =
        prefs(context).all.mapNotNull { (pkg, value) ->
            val parts = (value as? String)?.split("-") ?: return@mapNotNull null
            if (parts.size < 2) return@mapNotNull null
            val start = parts[0].toIntOrNull() ?: return@mapNotNull null
            val end = parts[1].toIntOrNull() ?: return@mapNotNull null
            val days = if (parts.size >= 3) parseDays(parts[2]) ?: ALL_DAYS else ALL_DAYS
            pkg to Window(start, end, days)
        }.toMap()

    /** Parses "HH:MM-HH:MM" into a Window (all days), or null if malformed. */
    fun parseWindowRange(range: String): Window? {
        val parts = range.split("-")
        if (parts.size != 2) return null
        val start = parseHourMinute(parts[0]) ?: return null
        val end = parseHourMinute(parts[1]) ?: return null
        return Window(start, end)
    }

    /**
     * Parses a day-of-week spec: "weekend" (Sat+Sun), "weekday"/"weekdays" (Mon-Fri),
     * "all"/"daily"/"everyday", or a comma-separated list of 3-letter abbreviations
     * (sun,mon,tue,wed,thu,fri,sat). Returns null if malformed.
     */
    fun parseDays(text: String): Set<Int>? {
        val normalized = text.trim().lowercase()
        return when (normalized) {
            "weekend", "weekends" -> WEEKEND_DAYS
            "weekday", "weekdays" -> WEEKDAY_DAYS
            "all", "daily", "everyday" -> ALL_DAYS
            else -> {
                val days = normalized.split(",").map { it.trim() }
                if (days.isEmpty() || days.any { it.isBlank() }) return null
                val resolved = days.map { DAY_ABBREVIATIONS[it] ?: return null }.toSet()
                resolved
            }
        }
    }

    private fun parseHourMinute(text: String): Int? {
        val parts = text.trim().split(":")
        if (parts.size != 2) return null
        val h = parts[0].toIntOrNull() ?: return null
        val m = parts[1].toIntOrNull() ?: return null
        if (h !in 0..23 || m !in 0..59) return null
        return h * 60 + m
    }
}
