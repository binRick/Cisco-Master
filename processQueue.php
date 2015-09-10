<?php
include_once './vendor/autoload.php';
use Kue\Kue;
if(!class_exists('Kue\Kue', true))
	die('Kue class not found..  composer require kue/kue');



$kue = Kue::createQueue(array('host' => 'beo.infinitumtech.net', 'port' => '8100'));
print('connected to redis server..
	');


$kue->process('email', function($job){
	print('email job received
';
	$data = $job->data;
	echo 'sending email to ' . $data['to'] . '
';
});


$kue->process();
print('waiting for jobs to be submitted
	');
