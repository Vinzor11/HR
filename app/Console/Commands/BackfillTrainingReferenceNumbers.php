<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class BackfillTrainingReferenceNumbers extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'trainings:backfill-reference-numbers';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Backfill reference numbers for existing trainings that do not have one';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting to backfill training reference numbers...');
        
        $trainings = \App\Models\Training::whereNull('reference_number')->get();
        
        if ($trainings->isEmpty()) {
            $this->info('No trainings found without reference numbers.');
            return 0;
        }
        
        $this->info("Found {$trainings->count()} trainings without reference numbers.");
        
        $bar = $this->output->createProgressBar($trainings->count());
        $bar->start();
        
        foreach ($trainings as $training) {
            $dateStr = $training->date_from ? $training->date_from->format('Ymd') : date('Ymd');
            $baseRef = 'TRG-' . str_pad($training->training_id, 6, '0', STR_PAD_LEFT) . '-' . $dateStr;
            
            // Check if reference number already exists
            $counter = 1;
            $referenceNumber = $baseRef;
            while (\App\Models\Training::where('reference_number', $referenceNumber)
                ->where('training_id', '!=', $training->training_id)
                ->exists()) {
                $referenceNumber = $baseRef . '-' . $counter;
                $counter++;
            }
            
            $training->reference_number = $referenceNumber;
            $training->save();
            
            $bar->advance();
        }
        
        $bar->finish();
        $this->newLine();
        $this->info('Successfully backfilled all training reference numbers!');
        
        return 0;
    }
}
