<?php
/**
 * createQueue.php
 *
 * @package default
 */


include_once './vendor/autoload.php';
use Kue\Kue;
if (!class_exists('Kue\Kue', true))
	die('Kue class not found..  composer require kue/kue');



$kue = Kue::createQueue(array('host' => 'beo.infinitumtech.net', 'port' => '8100'));
print('connected to redis server..
	');

$queued=0;
echo 'adding items to the queue...
';
while (1) {

	$newJob =  array(
		'title' => 'email job #'.$queued,
		'to' => 'email_recip'.$queued.'@domain.com',
		'subject' => 'Reset your password!',
		'body' => 'Your can reset your password in 5 minutes. Url: http://xxx/reset'
	);
	echo 'submitting new job...
';
	var_dump($newJob);
	$kue->create('email', $newJob)->save();
	$queued++;

	sleep(1);
}
