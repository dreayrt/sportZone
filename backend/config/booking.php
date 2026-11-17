<?php

return [
    'hold_minutes' => 5,
    'recurrence' => [
        'weekly' => ['min_occurrences' => 4, 'max_occurrences' => 12, 'discount_percent' => 5],
        'monthly' => ['min_occurrences' => 3, 'max_occurrences' => 12, 'discount_percent' => 10],
    ],
];
