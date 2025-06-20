<!DOCTYPE html>
<html lang="<?= $locale; ?>">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
	    <title><?= sprintf('%1$s %2$s', $companyName ?? "", " | " . $baseTitle ?? ""); ?></title>
<?php if(isset($favicon) && !empty($favicon)) : ?>
	    <link rel="icon" type="image/x-icon" href="<?= $favicon; ?>" />
<?php endif; ?>
<?php if(isset($headerCss) && !empty($headerCss)) : ?>
<?php foreach($headerCss as $name => $src) : ?>
		<!-- Folha de estilos carregada: <?= $name; ?>-->
		<link rel="stylesheet" type="text/css" href="<?= $src; ?>">
<?php endforeach; ?>
<?php endif; ?>

<?php if(isset($javascriptData) && !empty($javascriptData)) : ?>
	    <script type="text/javascript" >
		    var sbData = <?= json_encode($javascriptData); ?>;
	    </script>
<?php endif; ?>
<?php if(isset($headerJs) && !empty($headerJs)) : ?>
	<?php foreach($headerJs as $name => $src) : ?>
		<!-- Módulo carregado: <?= $name; ?>-->
		<script type="text/javascript" src="<?= $src; ?>"></script>
	<?php endforeach; ?>
<?php endif; ?>
    </head>
    <body id="body-pd">
        <main class="container-wrapper position-relative">
			