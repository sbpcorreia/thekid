		</main>
	    <div id="app-alerta"></div>
<?php if(isset($footerJs) && !empty($footerJs)) : ?>
<?php foreach ($footerJs as $name => $src) : ?>
	    <!-- Módulo rodapé carregado: <?= $name ?> -->
	    <script type="text/javascript" src="<?= $src; ?>"></script>
<?php endforeach; ?>
<?php endif; ?>
    </body>
</html>