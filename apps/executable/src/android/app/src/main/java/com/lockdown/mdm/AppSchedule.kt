package com.lockdown.mdm

/** Whether an app may be used at a minute of the day (0-1439) on a Calendar.DAY_OF_WEEK. */
interface AccessSchedule {
    fun contains(nowMinute: Int, dayOfWeek: Int): Boolean
}

/**
 * When an app may be used, as set in the chatbot (ProvisioningConfig.appSchedules): per
 * Calendar.DAY_OF_WEEK, the minute ranges it's enabled in, end exclusive. A day left out blocks
 * the app all day. Unlike [ScheduleStore.Window] (one range for a set of days, set over adb),
 * each day has its own ranges, several per day; none crosses midnight (the chatbot splits that
 * across two days).
 */
data class AppSchedule(val days: Map<Int, List<IntRange>>) : AccessSchedule {

    override fun contains(nowMinute: Int, dayOfWeek: Int): Boolean =
        days[dayOfWeek]?.any { nowMinute in it } ?: false

    override fun toString(): String {
        if (days.isEmpty()) return "blocked all week"
        return days.entries.sortedBy { it.key }.joinToString("; ") { (day, ranges) ->
            val label = ScheduleStore.DAY_LABELS[day] ?: day.toString()
            label + " " + ranges.joinToString(", ") { "${format(it.first)}-${format(it.last + 1)}" }
        }
    }

    companion object {
        /**
         * From the config's shape: day abbreviation (sun..sat) to "HH:MM" start/end pairs. Null
         * when any day or time is malformed or a range doesn't end after it starts, so a bad
         * schedule is dropped rather than half-applied.
         */
        fun parse(days: Map<String, List<Pair<String, String>>>): AppSchedule? {
            val parsed = mutableMapOf<Int, List<IntRange>>()
            for ((label, pairs) in days) {
                val day = ScheduleStore.DAY_ABBREVIATIONS[label] ?: return null
                val ranges = pairs.map { (start, end) ->
                    val from = ScheduleStore.parseHourMinute(start) ?: return null
                    val to = ScheduleStore.parseHourMinute(end) ?: return null
                    if (from >= to) return null
                    from until to
                }
                if (ranges.isNotEmpty()) parsed[day] = ranges.sortedBy { it.first }
            }
            return AppSchedule(parsed)
        }

        private fun format(minute: Int) = "%02d:%02d".format(minute / 60, minute % 60)
    }
}
